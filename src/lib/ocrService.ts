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
}

export class OCRService {
  // Using Hugging Face Inference API
  private static apiUrl = 'https://api-inference.huggingface.co/models/stepfun-ai/GOT-OCR2_0';
  private static apiToken = import.meta.env.VITE_HUGGING_FACE_API_TOKEN || '';
  
  /**
   * Process an image with OCR to extract menu text
   * @param imageFileId The Appwrite storage file ID
   * @param bucketId The Appwrite storage bucket ID
   * @returns Processed menu text data
   */
  static async processMenuImage(imageFileId: string, bucketId: string): Promise<MenuOCRResult> {
    try {
      // Get the file URL from Appwrite
      const fileUrl = storage.getFileView(bucketId, imageFileId);
      
      // Call Hugging Face Inference API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: {
            image: fileUrl
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }
      
      const ocrResult = await response.json();
      
      // Process the raw OCR text into structured menu items
      const menuItems = this.processMenuText(ocrResult[0].generated_text);
      
      return {
        menuItems,
        rawText: ocrResult[0].generated_text
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
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
