import { storage, databases } from './appwrite';
import { ID } from './appwrite';
import { AppwriteService } from './appwriteService';

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
  // Support both Netlify and Vercel serverless functions for OCR API
  private static netlifyOcrUrl = '/.netlify/functions/ocr-service';
  private static vercelOcrUrl = '/api/ocr-service';
  
  /**
   * Get the appropriate OCR URL based on the deployment environment
   * @returns The OCR API URL
   */
  private static getOcrUrl(): string {
    // Check if we're on Vercel by looking for the vercel.app domain
    const isVercel = typeof window !== 'undefined' && 
                    (window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('vercel-analytics'));
    
    return isVercel ? this.vercelOcrUrl : this.netlifyOcrUrl;
  }
  
  /**
   * Process an image with OCR to extract menu text
   * @param imageFileId The Appwrite storage file ID
   * @param bucketId The Appwrite storage bucket ID
   * @returns Processed menu text data
   */
  static async processMenuImage(imageFileId: string, bucketId: string): Promise<MenuOCRResult> {
    try {
      // Get a direct download URL from Appwrite - this creates a publicly accessible URL
      const fileUrl = storage.getFileDownload(bucketId, imageFileId);
      console.log('File URL:', fileUrl);
      
      // Add a timestamp to avoid caching issues
      const timestamp = Date.now();
      const fileUrlWithTimestamp = `${fileUrl}&timestamp=${timestamp}`;
      console.log('File URL with timestamp:', fileUrlWithTimestamp);
      
      // Call our serverless function for OCR
      const ocrUrl = this.getOcrUrl();
      console.log('Calling OCR serverless function at:', ocrUrl);
      const response = await fetch(ocrUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrl: fileUrlWithTimestamp
        }),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          // Try to parse the error response as JSON
          errorData = await response.json();
          console.error('OCR API error:', errorData);
        } catch (parseError) {
          // If the response is not valid JSON, get the text instead
          const errorText = await response.text();
          console.error('OCR API error (non-JSON):', errorText);
          
          // Create a structured error object from the text
          errorData = {
            error: 'Failed to parse error response',
            message: errorText.substring(0, 100) // Only include the first 100 chars to avoid huge errors
          };
        }
        
        // Throw a more descriptive error
        const errorMessage = errorData.error || response.statusText;
        throw new Error(`OCR API error: ${errorMessage}`);
      }
      
      const data = await response.json();
      console.log('OCR API response:', data);
      
      // Extract text from OCR response format
      let rawText = '';
      
      // Check if the response contains the standard format with pages array
      if (data.pages && Array.isArray(data.pages)) {
        console.log('Found pages array with', data.pages.length, 'pages');
        
        // Concatenate markdown from all pages
        for (const page of data.pages) {
          if (page.markdown) {
            rawText += page.markdown + '\n\n';
            console.log('Extracted markdown from page', page.index || 'unknown');
          }
        }
        
        if (rawText) {
          console.log('Successfully extracted text from pages');
        } else {
          console.warn('Pages array found but no markdown content');
          // Log the structure of the first page for debugging
          if (data.pages.length > 0) {
            console.log('First page structure:', Object.keys(data.pages[0]));
          }
        }
      } 
      // Fall back to other possible formats
      else if (data.text) {
        rawText = data.text;
        console.log('Text found directly in response.text');
      } else if (data.rawText) {
        rawText = data.rawText;
        console.log('Text found in response.rawText');
      } else if (data.extractedText) {
        rawText = data.extractedText;
        console.log('Text found in response.extractedText');
      } else if (typeof data === 'string') {
        rawText = data;
        console.log('Response is directly a string');
      } else {
        console.log('Response structure:', Object.keys(data));
        console.warn('Could not find text in the response. Using empty string.');
      }
      
      // Check if there's enough text to process
      if (!rawText || rawText.trim().length < 20) {
        console.warn('Insufficient text detected in the image. Cannot extract menu items.');
        throw new Error('No menu text detected in the image. Please try with a clearer menu photo.');
      }
      
      // Try to use enhanced menu structure analysis
      let enhancedMenuStructure = null;
      let menuItems = [];
      let isMenuContent = true;
      
      try {
        // Call the new menu structure analysis
        console.log('Attempting enhanced menu structure analysis...');
        enhancedMenuStructure = await this.analyzeMenuStructure(rawText);
        console.log('Enhanced menu structure:', enhancedMenuStructure);
        
        // Check if the content was identified as a menu
        if (enhancedMenuStructure && enhancedMenuStructure.isMenu === false) {
          console.warn('Content was not identified as a menu. Using raw text instead.');
          isMenuContent = false;
          
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
        
        // If no items were extracted at all, fall back to basic processing
        if (menuItems.length === 0) {
          throw new Error('No content could be extracted from the image.');
        }
      } catch (analysisError) {
        console.error('Enhanced menu analysis failed, falling back to basic processing:', analysisError);
        // Fall back to basic processing if enhanced analysis fails
        menuItems = this.processMenuText(rawText);
        console.log('Menu items extracted from basic processing:', menuItems.length);
        
        // If basic processing also failed to extract any items, throw an error
        if (menuItems.length === 0) {
          throw new Error('No content could be extracted from the image. Please try with a clearer photo.');
        }
      }
      
      // Extract restaurant name from enhanced structure if available
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
          model: data.model || 'ocr-latest',
          textLength: rawText.length,
          extractedItems: menuItems.length,
          processingTimeMs: data.processingTimeMs || 0,
          enhancedAnalysis: !!enhancedMenuStructure
        }
      };
      
      console.log('Processed OCR result:', ocrResult);
      return ocrResult;
    } catch (error: unknown) {
      console.error('OCR processing error:', error);
      
      // Create a more user-friendly error message
      let userMessage = 'Failed to process menu image';
      
      // Type guard to check if error is an Error object with a message property
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          userMessage = 'The OCR processing timed out. Please try again with a clearer image or try later.';
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
   * Save OCR results to Appwrite database
   * @param menuId The ID of the menu document
   * @param ocrResult The OCR processing result
   * @param collectionId The Appwrite collection ID for menu documents
   */
  static async saveOCRResults(menuId: string, ocrResult: MenuOCRResult, collectionId: string): Promise<void> {
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
      
      console.log('Saving structured menu data to Appwrite:', structuredMenuItems);
      
      await databases.updateDocument(
        AppwriteService.databaseId,
        collectionId,
        menuId,
        updateData
      );
      
      // Then save each menu item to a separate collection for individual access
      for (const item of ocrResult.menuItems) {
        // Skip category entries (they don't have a price)
        if (!item.name || item.name === item.category) continue;
        
        await databases.createDocument(
          AppwriteService.databaseId,
          'menu_items', // You'll need to create this collection
          ID.unique(),
          {
            menu_id: menuId,
            name: item.name,
            description: item.description || '',
            price: item.price || '',
            category: item.category || 'Uncategorized'
          }
        );
      }
    } catch (error) {
      console.error('Error saving OCR results:', error);
      throw error;
    }
  }
  
  /**
   * Enhanced menu structure analysis using LLM
   * @param rawText Raw OCR text
   * @returns Structured menu data with sections and items
   */
  static async analyzeMenuStructure(rawText: string): Promise<any> {
    try {
      // Get the appropriate URL based on deployment environment
      const isVercel = typeof window !== 'undefined' && 
                      (window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('vercel-analytics'));
      
      const analysisUrl = isVercel ? '/api/menu-structure-analysis' : '/.netlify/functions/menu-structure-analysis';
      
      console.log('Calling menu structure analysis at:', analysisUrl);
      const response = await fetch(analysisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ocrText: rawText
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Menu structure analysis failed: ${response.statusText}. ${errorText}`);
      }
      
      const data = await response.json();
      return data.menuStructure;
    } catch (error) {
      console.error('Menu structure analysis error:', error);
      throw error;
    }
  }
  
  /**
   * Convert the enhanced menu structure to the MenuOCRResult format
   * @param enhancedStructure The enhanced menu structure from LLM analysis
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
        // Add the section header as a menu item
        menuItems.push({
          name: section.sectionName,
          category: section.sectionName
        });
        
        // Add each item in the section
        if (section.items && Array.isArray(section.items)) {
          for (const item of section.items) {
            menuItems.push({
              name: item.name,
              price: item.price || '',
              description: item.description || '',
              category: section.sectionName
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
          id: ID.unique() // Add a unique ID for each item to make them easily referenceable
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
