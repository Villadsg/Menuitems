import { supabase } from './supabase';
import { SupabaseService } from './supabaseService';
import { applyMenuCorrections } from './menuCorrections';
import { applyLearnedMenuCorrections, initializeMenuLearningSystem } from './menuLearningSystem';

export interface MenuOCRResult {
  menuItems: {
    name: string;
    description?: string;
    price?: string;
    category?: string;
  }[];
  restaurantName?: string;
  rawText: string;
  enhancedStructure?: any;
  debug?: any;
}

export class OCRService {
  // Default configuration for local Qwen 2.5 VL instance
  private static defaultConfig = {
    baseUrl: 'http://localhost:11434', // Default Ollama port
    model: 'qwen2.5vl:7b',
    timeout: 30000
  };

  /**
   * Get OCR configuration from environment or use defaults
   * @returns OCR configuration
   */
  private static getConfig() {
    // In browser environment, always use default localhost config
    if (typeof window !== 'undefined') {
      return this.defaultConfig;
    }

    // Server-side: Check for custom configuration from environment
    const customConfig = {
      baseUrl: (typeof process !== 'undefined' && process.env?.QWEN_VL_BASE_URL) || this.defaultConfig.baseUrl,
      model: (typeof process !== 'undefined' && process.env?.QWEN_VL_MODEL) || this.defaultConfig.model,
      timeout: parseInt((typeof process !== 'undefined' && process.env?.QWEN_VL_TIMEOUT) || String(this.defaultConfig.timeout))
    };

    return customConfig;
  }
  
  /**
   * Process an image with OCR to extract menu text using Qwen 2.5 VL
   * @param imageFileId The Supabase storage file ID
   * @param bucketId The Supabase storage bucket ID
   * @returns Processed menu text data
   */
  static async processMenuImage(imageFileId: string, bucketId: string = 'photos'): Promise<MenuOCRResult> {
    try {
      const config = this.getConfig();
      
      // Try to get a signed URL first (for private buckets), fallback to public URL
      let fileUrl = '';
      
      try {
        // Try signed URL first (expires in 1 hour)
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from(bucketId)
          .createSignedUrl(imageFileId, 3600);
        
        if (signedError || !signedUrlData?.signedUrl) {
          console.log('Signed URL failed, trying public URL...');
          // Fallback to public URL
          const { data: urlData } = supabase.storage.from(bucketId).getPublicUrl(imageFileId);
          fileUrl = urlData.publicUrl;
        } else {
          fileUrl = signedUrlData.signedUrl;
          console.log('Using signed URL');
        }
      } catch (error) {
        console.log('Error getting signed URL, using public URL:', error);
        // Fallback to public URL
        const { data: urlData } = supabase.storage.from(bucketId).getPublicUrl(imageFileId);
        fileUrl = urlData.publicUrl;
      }
      
      console.log('File URL:', fileUrl);
      
      // Add a timestamp to avoid caching issues (only if not already a signed URL)
      let finalUrl = fileUrl;
      if (!fileUrl.includes('token=')) {
        const timestamp = Date.now();
        const separator = fileUrl.includes('?') ? '&' : '?';
        finalUrl = `${fileUrl}${separator}timestamp=${timestamp}`;
      }
      console.log('Final URL:', finalUrl);
      
      // Convert image URL to base64 for Ollama
      console.log('Fetching and converting image to base64...');
      let imageBase64 = '';
      
      try {
        const imageResponse = await fetch(finalUrl);
        
        if (!imageResponse.ok) {
          console.error('Image fetch failed:', {
            status: imageResponse.status,
            statusText: imageResponse.statusText,
            url: finalUrl
          });
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        const imageBlob = await imageResponse.blob();
        console.log('Image blob size:', imageBlob.size, 'type:', imageBlob.type);
        
        const arrayBuffer = await imageBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        const base64String = btoa(String.fromCharCode(...uint8Array));
        imageBase64 = base64String;
        
        console.log('Image converted to base64, length:', imageBase64.length);
      } catch (imageError) {
        console.error('Error fetching/converting image:', imageError);
        throw new Error(`Failed to process image: ${imageError.message}`);
      }

      // Call Qwen 2.5 VL for OCR
      console.log('Calling Qwen 2.5 VL for OCR analysis...');
      const response = await fetch(`${config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          prompt: `You are an expert at reading and analyzing menu images. Please extract all text from this menu image and structure it as a JSON object with the following format:

{
  "restaurantName": "Name of the restaurant (if visible)",
  "menuSections": [
    {
      "sectionName": "Section name (e.g., Appetizers, Main Course, etc.)",
      "items": [
        {
          "name": "Item name",
          "description": "Item description (if available)",
          "price": "Price (if available, include currency symbol)"
        }
      ]
    }
  ],
  "isMenu": true,
  "rawText": "All text found in the image"
}

Focus on:
1. Accurately extracting all text, especially prices and item names
2. Properly grouping items by categories/sections
3. Handling different orientations and languages
4. Identifying the restaurant name if visible
5. Being precise with price formatting

If this is not a menu image, set "isMenu": false and include the raw text.`,
          images: [imageBase64],
          stream: false
        }),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Qwen VL API error:', errorText);
        throw new Error(`Qwen VL API error: ${response.statusText}. ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Qwen VL API response:', data);
      
      // Extract the generated response
      let rawResponse = '';
      if (data.response) {
        rawResponse = data.response;
      } else if (data.message && data.message.content) {
        rawResponse = data.message.content;
      } else {
        console.warn('Unexpected response format from Qwen VL');
        rawResponse = JSON.stringify(data);
      }
      
      // Parse the JSON response from Qwen VL
      let enhancedMenuStructure = null;
      let rawText = '';
      let menuItems = [];
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enhancedMenuStructure = JSON.parse(jsonMatch[0]);
          rawText = enhancedMenuStructure.rawText || rawResponse;
          
          // Check if the content was identified as a menu
          if (enhancedMenuStructure.isMenu === false) {
            console.warn('Content was not identified as a menu. Using raw text instead.');
            
            // Create simple text items from the raw text
            const lines = rawText.split('\n').filter(line => line.trim());
            for (const line of lines) {
              if (line.trim()) {
                menuItems.push({
                  name: line.trim(),
                  category: 'Text Content'
                });
              }
            }
          } else {
            // Convert the enhanced structure to menu items
            menuItems = this.convertEnhancedStructureToMenuItems(enhancedMenuStructure);
            console.log('Menu items extracted from enhanced structure:', menuItems.length);
          }
        } else {
          // If no JSON found, treat as plain text
          rawText = rawResponse;
          menuItems = this.processMenuText(rawText);
          console.log('Menu items extracted from basic processing:', menuItems.length);
        }
      } catch (parseError) {
        console.error('Error parsing Qwen VL response, falling back to basic processing:', parseError);
        rawText = rawResponse;
        menuItems = this.processMenuText(rawText);
        console.log('Menu items extracted from fallback processing:', menuItems.length);
      }
      
      // Check if there's enough text to process
      if (!rawText || rawText.trim().length < 20) {
        console.warn('Insufficient text detected in the image. Cannot extract menu items.');
        throw new Error('No menu text detected in the image. Please try with a clearer menu photo.');
      }
      
      // If no items were extracted at all, throw an error
      if (menuItems.length === 0) {
        throw new Error('No content could be extracted from the image. Please try with a clearer photo.');
      }
      
      // Extract restaurant name
      let restaurantName = "Unknown Restaurant";
      
      // First try to get the name from the enhanced structure
      if (enhancedMenuStructure && enhancedMenuStructure.restaurantName) {
        restaurantName = enhancedMenuStructure.restaurantName;
        console.log('Restaurant name from enhanced structure:', restaurantName);
      }
      
      // If we couldn't get a name or got the default, try to extract it from the raw text
      if (restaurantName === "Unknown Restaurant" || restaurantName.includes("OR")) {
        const extractedName = this.extractRestaurantNameFromRawText(rawText);
        if (extractedName) {
          restaurantName = extractedName;
          console.log('Restaurant name extracted from raw text:', restaurantName);
        }
      }
      
      // Create the OCR result
      const ocrResult: MenuOCRResult = {
        rawText,
        menuItems,
        restaurantName,
        enhancedStructure: enhancedMenuStructure,
        debug: {
          model: config.model,
          textLength: rawText.length,
          extractedItems: menuItems.length,
          processingTimeMs: data.eval_duration || 0,
          enhancedAnalysis: !!enhancedMenuStructure
        }
      };
      
      console.log('Processed OCR result:', ocrResult);
      
      // Apply basic menu corrections (price formatting, etc.)
      const basicCorrectedResult = applyMenuCorrections(ocrResult);
      console.log('Applied basic menu corrections to OCR result');
      
      // Apply learned corrections from feedback data
      const fullyCorrectedResult = applyLearnedMenuCorrections(basicCorrectedResult);
      console.log('Applied learned corrections from feedback data');
      
      return fullyCorrectedResult;
    } catch (error: unknown) {
      console.error('OCR processing error:', error);
      
      // Create a more user-friendly error message
      let userMessage = 'Failed to process menu image';
      
      // Type guard to check if error is an Error object with a message property
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          userMessage = 'The OCR processing timed out. Please try again with a clearer image or try later.';
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
          userMessage = 'Cannot connect to Qwen VL service. Please ensure Qwen 2.5 VL is running locally on port 11434.';
        } else if (error.message.includes('rate limit')) {
          userMessage = 'OCR service rate limit exceeded. Please try again in a few minutes.';
        } else if (error.message.includes('Failed to parse error response')) {
          userMessage = 'The OCR service is currently experiencing issues. Please try again later.';
        } else if (error.message.includes('service is temporarily unavailable') || 
                  error.message.includes('status code 503') || 
                  error.message.includes('unavailable')) {
          userMessage = 'The OCR service is temporarily unavailable. Please try again later.';
        }
      }
      
      // Create a structured error with additional context
      const enhancedError = new Error(userMessage);
      // Use type assertion for cause property
      (enhancedError as any).cause = error;
      if (error instanceof Error) {
        (enhancedError as any).originalMessage = error.message;
      }
      
      throw enhancedError;
    }
  }
  
  /**
   * Process raw OCR text into structured menu items
   * @param text Raw OCR text
   * @returns Structured menu items
   */
  private static processMenuText(text: string): MenuOCRResult['menuItems'] {
    // If text is empty or too short (less than 20 chars), return empty array
    if (!text || text.trim().length < 20) {
      console.log('Insufficient text for menu item extraction, returning empty array');
      return [];
    }
    
    const lines = text.split('\n').filter(line => line.trim());
    
    // If there are too few lines, it's probably not a menu
    if (lines.length < 3) {
      console.log('Too few lines for menu item extraction, returning empty array');
      return [];
    }
    
    const menuItems: MenuOCRResult['menuItems'] = [];
    let currentCategory = 'Uncategorized';
    let priceCount = 0;
    
    for (const line of lines) {
      // Look for price patterns (e.g., $12.99)
      const priceMatch = line.match(/\$\d+\.\d{2}|\d+\.\d{2}€|\d+\.\d{2}/);
      
      // Check if line is all caps or ends with a colon - likely a category
      if (line.match(/^[A-Z\s]+$/) || line.endsWith(':')) {
        currentCategory = line.trim().replace(/:$/, '');
        menuItems.push({
          name: currentCategory,
          category: currentCategory
        });
      } else if (priceMatch) {
        // This is likely a menu item with price
        const price = priceMatch[0];
        const priceIndex = priceMatch.index || 0; // Default to 0 if undefined
        const name = line.substring(0, priceIndex).trim();
        const description = line.substring(priceIndex + price.length).trim();
        
        menuItems.push({
          name,
          price,
          description,
          category: currentCategory
        });
        priceCount++;
      } else if (line.trim()) {
        // This could be a menu item without a price or a description
        menuItems.push({
          name: line.trim(),
          category: currentCategory
        });
      }
    }
    
    // If we didn't find any prices and there are more than 10 lines,
    // this probably isn't a menu. In this case, just create items from the lines
    // without trying to categorize them.
    if (priceCount === 0 && lines.length > 10) {
      console.log('No prices found in text, treating as plain text');
      menuItems.length = 0; // Clear the array
      
      // Just create one item per line, with the actual text
      for (const line of lines) {
        if (line.trim()) {
          menuItems.push({
            name: line.trim(),
            category: 'Text Content'
          });
        }
      }
    }
    
    return menuItems;
  }
  
  /**
   * Save OCR results to Supabase database
   * @param menuId The ID of the menu document
   * @param ocrResult The OCR processing result
   * @param tableName The Supabase table name for menu documents
   */
  static async saveOCRResults(menuId: string, ocrResult: MenuOCRResult, tableName: string): Promise<void> {
    try {
      // Create a structured and separable format for menu items
      const structuredMenuItems = this.createStructuredMenuItems(ocrResult.menuItems);
      
      // First, save the raw text, enhanced structure, and structured menu items to the menu document
      const updateData: any = {
        ocr_raw_text: ocrResult.rawText,
        ocr_processed: true,
        ocrdata: JSON.stringify(structuredMenuItems) // Store structured menu items in ocrdata field
      };
      
      // Add enhanced structure if available
      if (ocrResult.enhancedStructure) {
        updateData.ocr_enhanced_structure = JSON.stringify(ocrResult.enhancedStructure);
      }
      
      console.log('Saving structured menu data to Supabase:', structuredMenuItems);
      
      await SupabaseService.updateDocument(tableName, menuId, updateData);
      
      // Then save each menu item to a separate table for individual access
      for (const item of ocrResult.menuItems) {
        // Skip category entries (they don't have a price)
        if (!item.name || item.name === item.category) continue;
        
        await SupabaseService.createDocument('menu_items', {
          menu_id: menuId,
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'Uncategorized'
        });
      }
    } catch (error) {
      console.error('Error saving OCR results:', error);
      throw error;
    }
  }
  
  
  /**
   * Convert the enhanced menu structure to the MenuOCRResult format
   * @param enhancedStructure The enhanced menu structure from Qwen VL analysis
   * @returns Menu items in the format expected by the application
   */
  private static convertEnhancedStructureToMenuItems(enhancedStructure: any): MenuOCRResult['menuItems'] {
    const menuItems: MenuOCRResult['menuItems'] = [];
    
    // Check if the structure is marked as not being a menu
    if (enhancedStructure && enhancedStructure.isMenu === false) {
      console.log('Text was not identified as a menu. Returning empty menu items.');
      return [];
    }
    
    if (enhancedStructure && enhancedStructure.menuSections) {
      for (const section of enhancedStructure.menuSections) {
        // Process each item in the section
        if (section.items && Array.isArray(section.items)) {
          for (const item of section.items) {
            menuItems.push({
              name: item.name || '',
              price: item.price || '',
              description: item.description || '',
              category: section.sectionName || 'Uncategorized'
            });
          }
        }
      }
    }
    
    return menuItems;
  }
  
  /**
   * Create a structured format for menu items that makes them easily separable
   * @param menuItems The menu items to structure
   * @returns A structured format with sections and items
   */
  /**
   * Attempt to extract a restaurant name from raw OCR text using heuristics
   * @param rawText The raw OCR text from the menu
   * @returns A potential restaurant name or null if none found
   */
  private static extractRestaurantNameFromRawText(rawText: string): string | null {
    if (!rawText || rawText.length < 5) return null;
    
    // Split the text into lines and clean them
    const lines = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) return null;
    
    // Common menu section names to avoid mistaking for restaurant names
    const commonSectionNames = [
      'menu', 'appetizers', 'starters', 'entrees', 'main', 'mains', 'desserts', 
      'drinks', 'beverages', 'sides', 'lunch', 'dinner', 'breakfast', 'brunch',
      'specials', 'special', 'daily', 'soup', 'salad', 'pasta', 'pizza', 'wine',
      'beer', 'cocktails', 'kids', 'children', 'takeout', 'take-out', 'to go',
      'vegetarian', 'vegan', 'gluten-free', 'allergens', 'snacks'
    ];
    
    // Check the first few lines for potential restaurant names
    // Focus on the first 5 lines as restaurant names often appear at the top
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // Skip very short lines or common section names
      if (line.length < 3 || commonSectionNames.some(section => 
          line.toLowerCase().includes(section))) {
        continue;
      }
      
      // Look for lines that might be restaurant names
      // 1. All caps or title case often indicates importance
      // 2. Contains words like Restaurant, Cafe, etc.
      // 3. Not too long (most restaurant names are reasonably short)
      if (
        (line === line.toUpperCase() || 
         (line[0] === line[0].toUpperCase() && line.length > 3)) && 
        line.length < 40 &&
        !line.includes('$') && // Avoid price lists
        !line.match(/^\d/) // Avoid lines starting with numbers
      ) {
        return line;
      }
      
      // Check for lines containing restaurant-related words
      const restaurantWords = ['restaurant', 'cafe', 'bistro', 'bar', 'grill', 
                              'ristorante', 'trattoria', 'pizzeria', 'kitchen',
                              'eatery', 'diner', 'steakhouse', 'pub', 'tavern'];
      
      if (restaurantWords.some(word => line.toLowerCase().includes(word))) {
        return line;
      }
    }
    
    // If we couldn't find anything in the first few lines, look for distinctive patterns
    // throughout the text that might indicate a restaurant name
    
    // Look for lines with "est." or "established" which often appear with restaurant names
    const establishedLine = lines.find(line => 
      line.toLowerCase().includes('est.') || 
      line.toLowerCase().includes('established') ||
      line.toLowerCase().includes('since'));
    
    if (establishedLine) {
      // Extract the part before "est." or "established"
      const parts = establishedLine.split(/est\.|established|since/i);
      if (parts.length > 0 && parts[0].trim().length > 0) {
        return parts[0].trim();
      }
    }
    
    // As a last resort, return the first line that's not a common menu section
    // and looks like it could be a name
    for (const line of lines) {
      if (line.length > 3 && 
          line.length < 40 && 
          !commonSectionNames.some(section => line.toLowerCase() === section) &&
          !line.includes('$') &&
          !line.match(/^\d/)) {
        return line;
      }
    }
    
    return null;
  }
  
  private static createStructuredMenuItems(menuItems: MenuOCRResult['menuItems']): any {
    // Group menu items by category
    const categorizedItems: Record<string, any[]> = {};
    
    // First pass: identify all categories
    for (const item of menuItems) {
      const category = item.category || 'Uncategorized';
      
      if (!categorizedItems[category]) {
        categorizedItems[category] = [];
      }
      
      // Only add actual menu items (not category headers) to the items array
      if (item.name !== category) {
        categorizedItems[category].push({
          name: item.name,
          price: item.price || null,
          description: item.description || '',
          id: crypto.randomUUID() // Add a unique ID for each item to make them easily referenceable
        });
      }
    }
    
    // Convert to array format for better structure
    const structuredMenu = {
      sections: Object.keys(categorizedItems).map(category => ({
        name: category,
        items: categorizedItems[category]
      })),
      metadata: {
        totalItems: menuItems.filter(item => item.name !== item.category).length,
        totalSections: Object.keys(categorizedItems).length,
        createdAt: new Date().toISOString()
      }
    };
    
    return structuredMenu;
  }
}
