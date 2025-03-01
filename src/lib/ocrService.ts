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
  rawText: string;
  debug?: any;
}

export class OCRService {
  // Using Netlify serverless functions instead of direct API calls
  private static huggingFaceUrl = '/.netlify/functions/ocr';
  private static layoutLMUrl = '/.netlify/functions/layoutlm-ocr';
  private static apiToken = import.meta.env.VITE_HUGGING_FACE_API_TOKEN || '';
  
  /**
   * Process an image with OCR to extract menu text
   * @param imageFileId The Appwrite storage file ID
   * @param bucketId The Appwrite storage bucket ID
   * @returns Processed menu text data
   */
  static async processMenuImage(imageFileId: string, bucketId: string, options: { useLayoutLM?: boolean } = {}): Promise<MenuOCRResult> {
    try {
      // Get the file URL from Appwrite
      const fileUrl = storage.getFileView(bucketId, imageFileId);
      console.log('File URL:', fileUrl);
      
      // Determine which OCR service to use
      const useLayoutLM = options.useLayoutLM === true;
      const serverlessUrl = useLayoutLM ? this.layoutLMUrl : this.huggingFaceUrl;
      
      // Call our serverless function instead of the API directly
      console.log(`Calling ${useLayoutLM ? 'LayoutLMv3' : 'Hugging Face OCR'} serverless function...`);
      const response = await fetch(serverlessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrl: fileUrl
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
      
      // Handle the new response format with debug info
      let ocrResult: MenuOCRResult;
      
      if (data.result && Array.isArray(data.result) && data.result[0] && data.result[0].generated_text) {
        const rawText = data.result[0].generated_text;
        
        // Use the pre-processed menu items from the serverless function if available
        // Otherwise fall back to client-side processing
        const menuItems = data.menuItems || this.processMenuText(rawText);
        
        console.log('Menu items extracted:', menuItems.length);
        
        // Log quality metrics from OCR models
        if (data.debug) {
          const debug = data.debug;
          
          if (debug.bestModel) {
            const isLayoutLM = debug.bestModel.includes('layoutlm');
            console.log(`OCR result from ${isLayoutLM ? 'LayoutLMv3' : 'Hugging Face'} model:`, debug.bestModel);
            console.log('OCR quality metrics:', {
              menuScore: debug.menuScore,
              textLength: debug.textLength,
              extractedItems: debug.extractedItems,
              processingTimeMs: debug.processingTimeMs || 'N/A'
            });
            
            if (isLayoutLM) {
              console.log('LayoutLMv3 provides better menu structure understanding');
            } else if (debug.menuKeywords) {
              console.log('Menu keywords detected:', debug.menuKeywords);
            }
          }
        }
        
        ocrResult = {
          rawText,
          menuItems,
          debug: data.debug || {}
        };
      } else if (data.text && data.usedFallback) {
        // Handle fallback model response format
        console.log('Processing text from fallback OCR model');
        const rawText = data.text;
        const menuItems = this.processMenuText(rawText);
        
        ocrResult = {
          rawText,
          menuItems,
          debug: { usedFallback: true, modelResponses: data.modelResponses }
        };
      } else {
        // Fallback for unexpected response format
        console.warn('Unexpected OCR response format:', data);
        ocrResult = {
          rawText: JSON.stringify(data),
          menuItems: [],
          debug: data.debug || {}
        };
      }
      
      console.log('Processed OCR result:', ocrResult);
      return ocrResult;
    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Create a more user-friendly error message
      let userMessage = 'Failed to process menu image';
      
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        userMessage = 'The OCR processing timed out. Please try again with a clearer image or try later.';
      } else if (error.message.includes('rate limit')) {
        userMessage = 'OCR service rate limit exceeded. Please try again in a few minutes.';
      } else if (error.message.includes('Failed to parse error response')) {
        userMessage = 'The OCR service is currently experiencing issues. Please try again later.';
      } else if (error.message.includes('service is temporarily unavailable') || 
                 error.message.includes('status code 503') || 
                 error.message.includes('unavailable')) {
        userMessage = 'The Hugging Face OCR service is temporarily unavailable. Please try again later.';
      }
      
      // Create a structured error with additional context
      const enhancedError = new Error(userMessage);
      enhancedError.cause = error;
      enhancedError.originalMessage = error.message;
      
      throw enhancedError;
    }
  }
  
  /**
   * Process raw OCR text into structured menu items
   * @param text Raw OCR text
   * @returns Structured menu items
   */
  private static processMenuText(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    const menuItems = [];
    let currentCategory = 'Uncategorized';
    
    for (const line of lines) {
      // Look for price patterns (e.g., $12.99)
      const priceMatch = line.match(/\$\d+\.\d{2}|\d+\.\d{2}€|\d+\.\d{2}/);
      
      // Check if line is all caps or ends with a colon - likely a category
      if (line.match(/^[A-Z\s]+$/) || line.endsWith(':')) {
        currentCategory = line.trim().replace(/:$/, '');
        menuItems.push({
          category: currentCategory
        });
      } else if (priceMatch) {
        // This is likely a menu item with price
        const price = priceMatch[0];
        const name = line.substring(0, priceMatch.index).trim();
        const description = line.substring(priceMatch.index + price.length).trim();
        
        menuItems.push({
          name,
          price,
          description,
          category: currentCategory
        });
      } else if (line.trim()) {
        // This could be a menu item without a price or a description
        menuItems.push({
          name: line.trim(),
          category: currentCategory
        });
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
      // First, save the raw text to the menu document
      await databases.updateDocument(
        AppwriteService.databaseId,
        collectionId,
        menuId,
        { 
          ocr_raw_text: ocrResult.rawText,
          ocr_processed: true
        }
      );
      
      // Then save each menu item to a separate collection
      for (const item of ocrResult.menuItems) {
        // Skip category entries (they don't have a name)
        if (!item.name) continue;
        
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
}
