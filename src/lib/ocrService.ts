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
  // Using Netlify serverless function for Mistral OCR API
  private static mistralOcrUrl = '/.netlify/functions/mistral-ocr';
  
  /**
   * Process an image with Mistral OCR to extract menu text
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
      
      // Call our serverless function for Mistral OCR
      console.log('Calling Mistral OCR serverless function...');
      const response = await fetch(this.mistralOcrUrl, {
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
      console.log('Mistral OCR API response:', data);
      
      // Extract text specifically from Mistral OCR response format
      let rawText = '';
      
      // Check if the response contains the standard Mistral OCR format with pages array
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
      
      // Process the extracted text to identify menu items
      const menuItems = this.processMenuText(rawText);
      console.log('Menu items extracted:', menuItems.length);
      
      // Create the OCR result
      const ocrResult: MenuOCRResult = {
        rawText,
        menuItems,
        debug: {
          model: data.model || 'mistral-ocr-latest',
          textLength: rawText.length,
          extractedItems: menuItems.length,
          processingTimeMs: data.processingTimeMs || 0
        }
      };
      
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
        userMessage = 'The Mistral OCR service is temporarily unavailable. Please try again later.';
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
