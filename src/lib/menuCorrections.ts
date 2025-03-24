/**
 * Menu Corrections Module
 * 
 * This module provides functions to correct common issues in OCR-processed menu data,
 * such as price formatting problems and ingredient attribution errors.
 */

import type { MenuOCRResult } from './ocrService';

/**
 * Correct common price formatting issues in menu items
 * @param menuItems Array of menu items to correct
 * @returns Corrected menu items
 */
export function correctPriceFormats(menuItems: MenuOCRResult['menuItems']): MenuOCRResult['menuItems'] {
  return menuItems.map(item => {
    if (item.price) {
      // Case 1: Missing decimal point in larger numbers (e.g., "1299" should be "12.99")
      if (/^\$?\d{3,}$/.test(item.price.trim())) {
        const numericValue = item.price.replace(/\D/g, '');
        // Assume the last two digits are cents
        const correctedPrice = numericValue.slice(0, -2) + '.' + numericValue.slice(-2);
        item.price = item.price.includes('$') ? '$' + correctedPrice : correctedPrice;
      }
      
      // Case 2: Ensure consistent decimal notation
      if (item.price.includes(',') && !item.price.includes('.')) {
        item.price = item.price.replace(',', '.');
      }
      
      // Case 3: Add currency symbol if missing
      if (!/[$€£¥]/.test(item.price)) {
        item.price = '$' + item.price;
      }
      
      // Case 4: Validate price is in a reasonable range for menu items
      // If price seems too high (e.g., > $100), it might be missing a decimal
      const numericValue = parseFloat(item.price.replace(/[^\d\.]/g, ''));
      if (numericValue > 100 && numericValue < 10000) {
        // Likely missing a decimal point
        const correctedPrice = (numericValue / 100).toFixed(2);
        item.price = item.price.replace(/\d+(\.\d+)?/, correctedPrice);
      }
    }
    return item;
  });
}

/**
 * Detect and distribute shared descriptions across menu items
 * @param menuItems Array of menu items to process
 * @param rawText The raw OCR text for context
 * @returns Menu items with properly distributed descriptions
 */
export function distributeSharedDescriptions(menuItems: MenuOCRResult['menuItems'], rawText: string): MenuOCRResult['menuItems'] {
  if (!menuItems || menuItems.length <= 1) {
    return menuItems;
  }

  // Step 1: Group items by category
  const itemsByCategory: Record<string, MenuOCRResult['menuItems']> = {};
  menuItems.forEach(item => {
    const category = item.category || 'Uncategorized';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });

  // Step 2: Process each category separately
  Object.keys(itemsByCategory).forEach(category => {
    const categoryItems = itemsByCategory[category];
    
    // Skip if only one item in category
    if (categoryItems.length <= 1) return;
    
    // Find items with descriptions and those without
    const itemsWithDesc = categoryItems.filter(item => item.description && item.description.trim() !== '');
    const itemsWithoutDesc = categoryItems.filter(item => !item.description || item.description.trim() === '');
    
    // If we have both items with and without descriptions, check for shared descriptions
    if (itemsWithDesc.length > 0 && itemsWithoutDesc.length > 0) {
      // Find potential shared descriptions (from the first item with a description)
      const potentialSharedDesc = itemsWithDesc[0].description;
      
      // Check if this description might be shared (based on heuristics)
      if (potentialSharedDesc && isLikelySharedDescription(potentialSharedDesc, categoryItems)) {
        // Apply the shared description to items without descriptions
        itemsWithoutDesc.forEach(item => {
          item.description = potentialSharedDesc;
        });
      }
    }
    
    // Look for patterns where multiple items have the same price but different names
    // This often indicates a group of items with a shared description
    const itemsByPrice: Record<string, MenuOCRResult['menuItems']> = {};
    categoryItems.forEach(item => {
      if (!item.price) return;
      if (!itemsByPrice[item.price]) {
        itemsByPrice[item.price] = [];
      }
      itemsByPrice[item.price].push(item);
    });
    
    // For each price group with multiple items
    Object.keys(itemsByPrice).forEach(price => {
      const priceGroup = itemsByPrice[price];
      if (priceGroup.length <= 1) return;
      
      // Find items with descriptions in this price group
      const groupItemsWithDesc = priceGroup.filter(item => item.description && item.description.trim() !== '');
      const groupItemsWithoutDesc = priceGroup.filter(item => !item.description || item.description.trim() === '');
      
      // If we have both items with and without descriptions in this price group
      if (groupItemsWithDesc.length > 0 && groupItemsWithoutDesc.length > 0) {
        // Find the most common description in this group
        const descriptions = groupItemsWithDesc.map(item => item.description);
        const mostCommonDesc = findMostCommonElement(descriptions);
        
        // Apply the most common description to items without descriptions
        if (mostCommonDesc) {
          groupItemsWithoutDesc.forEach(item => {
            item.description = mostCommonDesc;
          });
        }
      }
    });
  });
  
  return menuItems;
}

/**
 * Check if a description is likely to be shared across multiple items
 * @param description The description to check
 * @param items The group of items to check against
 * @returns True if the description is likely shared
 */
function isLikelySharedDescription(description: string, items: MenuOCRResult['menuItems']): boolean {
  // Heuristic 1: Shared descriptions are often longer
  if (description.length < 15) return false;
  
  // Heuristic 2: Shared descriptions often contain multiple ingredients or preparation methods
  const ingredientCount = (description.match(/,/g) || []).length + 1;
  if (ingredientCount >= 3) return true;
  
  // Heuristic 3: If the description contains phrases like "all served with" or "comes with"
  const sharedPhrases = [
    'all served with', 'all come with', 'all include', 
    'served with', 'comes with', 'choice of', 
    'all dishes', 'all items', 'all options'
  ];
  
  for (const phrase of sharedPhrases) {
    if (description.toLowerCase().includes(phrase)) {
      return true;
    }
  }
  
  // Heuristic 4: If many items in the group have the same price but different names
  const uniquePrices = new Set(items.map(item => item.price).filter(Boolean));
  if (uniquePrices.size === 1 && items.length >= 3) {
    return true;
  }
  
  return false;
}

/**
 * Find the most common element in an array
 * @param arr The array to search
 * @returns The most common element or undefined if array is empty
 */
function findMostCommonElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let maxElement: T | undefined = undefined;
  
  arr.forEach(element => {
    const key = String(element);
    counts[key] = (counts[key] || 0) + 1;
    
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      maxElement = element;
    }
  });
  
  return maxElement;
}

/**
 * Apply all menu corrections to the OCR result
 * @param ocrResult The OCR result to correct
 * @returns Corrected OCR result
 */
export function applyMenuCorrections(ocrResult: MenuOCRResult): MenuOCRResult {
  if (!ocrResult || !ocrResult.menuItems) {
    return ocrResult;
  }
  
  // Apply price corrections
  ocrResult.menuItems = correctPriceFormats(ocrResult.menuItems);
  
  // Distribute shared descriptions
  ocrResult.menuItems = distributeSharedDescriptions(ocrResult.menuItems, ocrResult.rawText);
  
  return ocrResult;
}
