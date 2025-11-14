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
  // Configuration constants
  private static readonly OCR_BASE_URL = 'http://localhost:8000';
  private static readonly OCR_TIMEOUT = 60000;
  private static readonly OCR_BASE_SIZE = 1024;
  private static readonly OCR_IMAGE_SIZE = 640;
  private static readonly OCR_PROMPT = `<image>\n<|grounding|>Extract this menu and convert to structured data. Include all menu items with their names, descriptions, and prices. Organize by categories if visible. Format the restaurant name clearly at the top.`;

  // Validation constants
  private static readonly MIN_TEXT_LENGTH = 20;
  private static readonly MIN_LINES_FOR_MENU = 3;

  // Default configuration for DeepSeek-OCR service
  private static defaultConfig = {
    baseUrl: this.OCR_BASE_URL,
    timeout: this.OCR_TIMEOUT
  };

  /**
   * Process image directly from File object (for anonymous users)
   * @param file The image file to process
   * @returns Processed menu text data
   */
  static async processImageDirectly(file: File): Promise<MenuOCRResult> {
    try {
      const config = this.getConfig();

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode(...uint8Array));

      // Call DeepSeek-OCR service
      const response = await fetch(`${config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64String,
          prompt: this.OCR_PROMPT,
          base_size: this.OCR_BASE_SIZE,
          image_size: this.OCR_IMAGE_SIZE,
          crop_mode: true,
          test_compress: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR service error:', response.status, response.statusText);
        throw new Error(`OCR API error: ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();

      // Extract structured data
      let rawText = '';
      let menuItems = [];
      let enhancedMenuStructure = null;

      if (data.menuItems && Array.isArray(data.menuItems)) {
        menuItems = data.menuItems.map((item: any) => ({
          name: item.name || '',
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'Uncategorized'
        }));
        rawText = data.rawText || '';
        enhancedMenuStructure = data.enhancedStructure || null;
      } else {
        rawText = data.rawText || JSON.stringify(data);
        menuItems = [];
      }

      // Extract restaurant name
      let restaurantName = "Unknown Restaurant";
      if (data.restaurantName) {
        restaurantName = data.restaurantName;
      } else if (enhancedMenuStructure && enhancedMenuStructure.restaurantName) {
        restaurantName = enhancedMenuStructure.restaurantName;
      }

      const ocrResult: MenuOCRResult = {
        rawText,
        menuItems,
        restaurantName,
        enhancedStructure: enhancedMenuStructure,
        debug: {
          model: 'deepseek-ai/DeepSeek-OCR',
          textLength: rawText.length,
          extractedItems: menuItems.length,
          enhancedAnalysis: !!enhancedMenuStructure,
          ...(data.debug || {})
        }
      };

      // Apply corrections
      const basicCorrectedResult = applyMenuCorrections(ocrResult);
      const fullyCorrectedResult = applyLearnedMenuCorrections(basicCorrectedResult);

      return fullyCorrectedResult;
    } catch (error) {
      console.error('Direct OCR processing error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

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
      baseUrl: (typeof process !== 'undefined' && process.env?.DEEPSEEK_OCR_BASE_URL) || this.defaultConfig.baseUrl,
      timeout: parseInt((typeof process !== 'undefined' && process.env?.DEEPSEEK_OCR_TIMEOUT) || String(this.defaultConfig.timeout))
    };

    return customConfig;
  }
  
  /**
   * Process an image with OCR to extract menu text using DeepSeek-OCR
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
      
      // Add a timestamp to avoid caching issues (only if not already a signed URL)
      let finalUrl = fileUrl;
      if (!fileUrl.includes('token=')) {
        const timestamp = Date.now();
        const separator = fileUrl.includes('?') ? '&' : '?';
        finalUrl = `${fileUrl}${separator}timestamp=${timestamp}`;
      }
      
      // Convert image URL to base64 for DeepSeek-OCR
      let imageBase64 = '';

      try {
        const imageResponse = await fetch(finalUrl);

        if (!imageResponse.ok) {
          console.error('Image fetch failed:', imageResponse.status, imageResponse.statusText);
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const imageBlob = await imageResponse.blob();
        console.log('Image processed, size:', imageBlob.size, 'bytes');

        const arrayBuffer = await imageBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to base64
        const base64String = btoa(String.fromCharCode(...uint8Array));
        imageBase64 = base64String;
      } catch (imageError) {
        console.error('Error processing image:', imageError.message);
        throw new Error(`Failed to process image: ${imageError.message}`);
      }

      // Call DeepSeek-OCR for menu extraction
      const response = await fetch(`${config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          prompt: this.OCR_PROMPT,
          base_size: this.OCR_BASE_SIZE,
          image_size: this.OCR_IMAGE_SIZE,
          crop_mode: true,
          test_compress: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR service error:', response.status, response.statusText);
        throw new Error(`DeepSeek-OCR API error: ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      console.log('OCR extraction completed, items found:', data.menuItems?.length || 0);
      
      // Extract the response from DeepSeek-OCR
      // The response should already be structured based on our FastAPI service
      let rawText = '';
      let menuItems = [];
      let enhancedMenuStructure = null;

      if (data.menuItems && Array.isArray(data.menuItems)) {
        // DeepSeek-OCR service already returns structured data
        menuItems = data.menuItems.map((item: any) => ({
          name: item.name || '',
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'Uncategorized'
        }));
        rawText = data.rawText || '';
        enhancedMenuStructure = data.enhancedStructure || null;
      } else {
        console.warn('Unexpected response format, attempting fallback processing');
        // Fallback to basic text processing if the response format is unexpected
        rawText = data.rawText || JSON.stringify(data);
        menuItems = this.processMenuText(rawText);
      }
      
      // Check if there's enough text to process
      if (!rawText || rawText.trim().length < this.MIN_TEXT_LENGTH) {
        console.warn('Insufficient text detected in the image. Cannot extract menu items.');
        throw new Error('No menu text detected in the image. Please try with a clearer menu photo.');
      }
      
      // If no items were extracted at all, throw an error
      if (menuItems.length === 0) {
        throw new Error('No content could be extracted from the image. Please try with a clearer photo.');
      }
      
      // Extract restaurant name
      let restaurantName = "Unknown Restaurant";

      // First try to get the name from the DeepSeek-OCR response
      if (data.restaurantName) {
        restaurantName = data.restaurantName;
      } else if (enhancedMenuStructure && enhancedMenuStructure.restaurantName) {
        restaurantName = enhancedMenuStructure.restaurantName;
      }

      // If we couldn't get a name or got the default, try to extract it from the raw text
      if (restaurantName === "Unknown Restaurant" || restaurantName.includes("OR")) {
        const extractedName = this.extractRestaurantNameFromRawText(rawText);
        if (extractedName) {
          restaurantName = extractedName;
        }
      }

      // Create the OCR result
      const ocrResult: MenuOCRResult = {
        rawText,
        menuItems,
        restaurantName,
        enhancedStructure: enhancedMenuStructure,
        debug: {
          model: 'deepseek-ai/DeepSeek-OCR',
          textLength: rawText.length,
          extractedItems: menuItems.length,
          processingTimeMs: 0,
          enhancedAnalysis: !!enhancedMenuStructure,
          ...(data.debug || {})
        }
      };

      // Apply basic menu corrections (price formatting, etc.)
      const basicCorrectedResult = applyMenuCorrections(ocrResult);

      // Apply learned corrections from feedback data
      const fullyCorrectedResult = applyLearnedMenuCorrections(basicCorrectedResult);
      console.log('Menu corrections applied');

      return fullyCorrectedResult;
    } catch (error: unknown) {
      console.error('OCR processing error:', error instanceof Error ? error.message : 'Unknown error');

      // Create a more user-friendly error message
      let userMessage = 'Failed to process menu image';
      
      // Type guard to check if error is an Error object with a message property
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          userMessage = 'The OCR processing timed out. Please try again with a clearer image or try later.';
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
          userMessage = 'Cannot connect to DeepSeek-OCR service. Please ensure the DeepSeek-OCR service is running locally on port 8000.';
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
    // If text is empty or too short, return empty array
    if (!text || text.trim().length < this.MIN_TEXT_LENGTH) {
      console.log('Insufficient text for menu item extraction');
      return [];
    }

    const lines = text.split('\n').filter(line => line.trim());

    // If there are too few lines, it's probably not a menu
    if (lines.length < this.MIN_LINES_FOR_MENU) {
      console.log('Too few lines for menu item extraction');
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
