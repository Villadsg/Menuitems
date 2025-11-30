/**
 * Menu Content Validation
 * Verifies that uploaded content is actually a restaurant menu
 */

export interface MenuItem {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  warnings: string[];
  errors: string[];
  details: {
    foodKeywordsFound: number;
    hasPrices: boolean;
    hasCategories: boolean;
    hasDescriptions: boolean;
    suspiciousPrices: string[];
  };
}

// Food-related keywords to check for menu content
const FOOD_KEYWORDS = [
  // Meal types
  'appetizer', 'appetizers', 'starter', 'starters', 'entree', 'entrees',
  'main', 'mains', 'dessert', 'desserts', 'beverage', 'beverages',
  'drink', 'drinks', 'side', 'sides',

  // Common menu categories
  'salad', 'salads', 'soup', 'soups', 'pasta', 'sandwich', 'sandwiches',
  'burger', 'burgers', 'pizza', 'pizzas', 'taco', 'tacos',

  // Proteins
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
  'seafood', 'steak', 'lamb', 'turkey', 'duck',

  // Cooking methods
  'grilled', 'fried', 'baked', 'roasted', 'steamed', 'sauteed',

  // Dietary
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'organic',

  // Common menu items
  'fries', 'rice', 'noodles', 'bread', 'cheese', 'sauce',
  'breakfast', 'lunch', 'dinner', 'brunch',

  // Cuisines
  'italian', 'chinese', 'japanese', 'mexican', 'thai', 'indian',
  'american', 'french', 'mediterranean', 'asian'
];

// Common menu section names
const MENU_SECTIONS = [
  'appetizers', 'starters', 'entrees', 'mains', 'main courses',
  'desserts', 'beverages', 'drinks', 'sides', 'salads', 'soups',
  'breakfast', 'lunch', 'dinner', 'brunch', 'specials'
];

/**
 * Validate that content appears to be a restaurant menu
 */
export function verifyMenuContent(menuItems: MenuItem[]): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    score: 0,
    warnings: [],
    errors: [],
    details: {
      foodKeywordsFound: 0,
      hasPrices: false,
      hasCategories: false,
      hasDescriptions: false,
      suspiciousPrices: []
    }
  };

  // Check if we have any items at all
  if (!menuItems || menuItems.length === 0) {
    result.errors.push('No menu items found');
    return result;
  }

  // Combine all text from menu items for keyword analysis
  const allText = menuItems
    .map(item => {
      const parts = [
        item.name || '',
        item.description || '',
        item.category || ''
      ];
      return parts.join(' ');
    })
    .join(' ')
    .toLowerCase();

  // 1. Check for food-related keywords
  const foundKeywords = FOOD_KEYWORDS.filter(keyword =>
    allText.includes(keyword.toLowerCase())
  );
  result.details.foodKeywordsFound = foundKeywords.length;

  if (foundKeywords.length === 0) {
    result.errors.push('No food-related content detected');
    result.warnings.push('This does not appear to be a restaurant menu');
  } else if (foundKeywords.length === 1) {
    result.warnings.push('Limited food-related content detected');
    result.score += 1;
  } else if (foundKeywords.length >= 2) {
    result.score += 3;
  }

  // 2. Check for prices
  const itemsWithPrices = menuItems.filter(item => item.price && item.price.trim());
  result.details.hasPrices = itemsWithPrices.length > 0;
  const priceRatio = menuItems.length > 0 ? itemsWithPrices.length / menuItems.length : 0;

  if (itemsWithPrices.length === 0) {
    result.errors.push('No prices found - menus typically include prices');
  } else if (priceRatio < 0.3) {
    result.warnings.push('Limited price information (less than 30% of items have prices)');
    result.score += 1;
  } else {
    result.score += 2;
  }

  // 3. Validate price reasonableness
  const suspiciousPrices: string[] = [];
  for (const item of itemsWithPrices) {
    if (!item.price) continue;

    // Extract numeric value from price
    const numericMatch = item.price.match(/\d+(?:[.,]\d{2})?/);
    if (numericMatch) {
      const priceValue = parseFloat(numericMatch[0].replace(',', '.'));

      // Flag unreasonably high prices (over $500)
      if (priceValue > 500) {
        suspiciousPrices.push(`${item.name}: ${item.price}`);
      }

      // Flag suspiciously low prices for mains (under $1)
      if (priceValue < 1 && !item.category?.toLowerCase().includes('side')) {
        result.warnings.push(`Unusually low price detected: ${item.name} (${item.price})`);
      }
    }
  }

  if (suspiciousPrices.length > 0) {
    result.details.suspiciousPrices = suspiciousPrices;
    result.warnings.push(`Unusually high prices detected (over $500): ${suspiciousPrices.join(', ')}`);
  }

  // 4. Check for categories/sections
  const categories = new Set(
    menuItems
      .map(item => item.category)
      .filter(cat => cat && cat.trim())
  );
  result.details.hasCategories = categories.size > 0;

  if (categories.size === 0) {
    result.warnings.push('No menu categories/sections found');
  } else if (categories.size >= 2) {
    result.score += 2;

    // Check if categories match typical menu sections
    const matchingCategories = Array.from(categories).filter(cat =>
      cat && MENU_SECTIONS.some(section =>
        cat.toLowerCase().includes(section) || section.includes(cat.toLowerCase())
      )
    );

    if (matchingCategories.length > 0) {
      result.score += 1;
    }
  } else {
    result.score += 1;
  }

  // 5. Check for descriptions
  const itemsWithDescriptions = menuItems.filter(item =>
    item.description && item.description.trim().length > 10
  );
  result.details.hasDescriptions = itemsWithDescriptions.length > 0;

  if (itemsWithDescriptions.length >= menuItems.length * 0.5) {
    result.score += 1;
  }

  // 6. Check for menu structure patterns
  if (result.details.hasCategories && result.details.hasPrices && foundKeywords.length >= 2) {
    result.score += 2;  // Bonus for having proper menu structure
  }

  // 7. Final validation
  // Need at least 2 food keywords to be considered a menu
  if (foundKeywords.length < 2) {
    result.errors.push('Insufficient food-related content to confirm this is a menu');
    result.isValid = false;
  } else if (result.score >= 5) {
    result.isValid = true;
  } else {
    result.errors.push('Content does not meet minimum requirements for a restaurant menu');
    result.isValid = false;
  }

  return result;
}

/**
 * Quick check if text contains menu-like content
 */
export function hasMenuKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  const foundKeywords = FOOD_KEYWORDS.filter(kw => lowerText.includes(kw));
  return foundKeywords.length >= 2;
}

/**
 * Extract and validate menu sections
 */
export function validateMenuStructure(menuItems: MenuItem[]): {
  hasStructure: boolean;
  sections: string[];
  itemsPerSection: Record<string, number>;
} {
  const sections = new Set<string>();
  const itemsPerSection: Record<string, number> = {};

  for (const item of menuItems) {
    if (item.category) {
      sections.add(item.category);
      itemsPerSection[item.category] = (itemsPerSection[item.category] || 0) + 1;
    }
  }

  return {
    hasStructure: sections.size >= 2,
    sections: Array.from(sections),
    itemsPerSection
  };
}
