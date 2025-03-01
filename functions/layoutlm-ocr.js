import axios from 'axios';

/**
 * Process menu text to extract menu items
 * This function extracts structured menu items from the LayoutLMv3 output
 */
function processMenuItems(layoutOutput) {
  if (!layoutOutput || !layoutOutput.text) {
    return [];
  }
  
  const text = layoutOutput.text;
  const lines = text.split('\n').filter(line => line.trim());
  const menuItems = [];
  let currentCategory = 'Uncategorized';
  
  // Common menu section headers
  const sectionHeaders = [
    'APPETIZERS', 'STARTERS', 'SMALL PLATES',
    'ENTREES', 'MAIN COURSES', 'MAINS',
    'DESSERTS', 'SWEETS',
    'DRINKS', 'BEVERAGES', 'COCKTAILS', 'WINE', 'BEER',
    'SIDES', 'SALADS', 'SOUPS', 'PASTA', 'PIZZA',
    'BREAKFAST', 'LUNCH', 'DINNER', 'BRUNCH'
  ];
  
  // Regular expressions for better pattern matching
  const categoryRegex = new RegExp(`^(${sectionHeaders.join('|')}|[A-Z\\s&]+)$`);
  const priceRegex = /\$\d+(\.\d{1,2})?|\d+(\.\d{1,2})?€|\d+(\.\d{1,2})?(\s?USD|\s?EUR)?/g;
  
  // If we have structured blocks from LayoutLMv3, use them
  if (layoutOutput.blocks && Array.isArray(layoutOutput.blocks)) {
    // Process structured blocks from LayoutLMv3
    // This is where the layout understanding helps group related text
    
    for (const block of layoutOutput.blocks) {
      // Skip empty blocks
      if (!block.text || !block.text.trim()) continue;
      
      const blockText = block.text.trim();
      
      // Check if block is a category header
      if (categoryRegex.test(blockText) || blockText.endsWith(':') || 
          (blockText.toUpperCase() === blockText && blockText.length > 3)) {
        currentCategory = blockText.replace(/:$/, '');
        menuItems.push({
          category: currentCategory
        });
        continue;
      }
      
      // Check for price in the block
      const prices = blockText.match(priceRegex);
      
      if (prices && prices.length > 0) {
        // This block contains a price, likely a menu item
        const price = prices[0];
        let itemName = blockText.replace(price, '').trim();
        
        // Clean up the item name
        itemName = itemName.replace(/\\s+/g, ' ').replace(/^[-•\\s]+|[-•\\s]+$/g, '');
        
        if (itemName) {
          menuItems.push({
            name: itemName,
            price: price,
            category: currentCategory
          });
        }
      } else if (blockText.length > 3 && !blockText.match(/^[0-9.]+$/)) {
        // This might be an item without a price or a description
        menuItems.push({
          name: blockText,
          category: currentCategory
        });
      }
    }
  } else {
    // Fallback to line-by-line processing if no structured blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if line is a category header
      if (categoryRegex.test(line) || line.endsWith(':') || 
          (line.toUpperCase() === line && line.length > 3)) {
        currentCategory = line.replace(/:$/, '');
        menuItems.push({
          category: currentCategory
        });
        continue;
      }
      
      // Look for price patterns
      const prices = line.match(priceRegex);
      
      if (prices && prices.length > 0) {
        // This line contains a price, likely a menu item
        const price = prices[0];
        let itemName = line.replace(price, '').trim();
        
        // Clean up the item name
        itemName = itemName.replace(/\\s+/g, ' ').replace(/^[-•\\s]+|[-•\\s]+$/g, '');
        
        if (itemName) {
          menuItems.push({
            name: itemName,
            price: price,
            category: currentCategory
          });
        }
      } else if (line.length > 3 && !line.match(/^[0-9.]+$/)) {
        // This might be an item without a price or a description
        // Check if the next line has a price
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
        const nextLinePrices = nextLine.match(priceRegex);
        
        if (nextLinePrices && nextLinePrices.length > 0) {
          // Next line has a price, this is likely an item name
          menuItems.push({
            name: line,
            price: nextLinePrices[0],
            category: currentCategory
          });
          i++; // Skip the next line since we've processed it
        } else {
          // This could be a standalone item or description
          menuItems.push({
            name: line,
            category: currentCategory
          });
        }
      }
    }
  }
  
  return menuItems;
}

/**
 * Calculate a menu quality score based on extracted content
 */
function calculateMenuScore(text, menuItems) {
  if (!text || !menuItems || menuItems.length === 0) {
    return 0;
  }
  
  // Base score from number of items extracted
  let score = Math.min(10, menuItems.length / 3);
  
  // Check for menu keywords
  const menuKeywords = ['menu', 'appetizer', 'entree', 'dessert', 'drink', 'special', 'price'];
  const lowerText = text.toLowerCase();
  const keywordsFound = menuKeywords.filter(keyword => lowerText.includes(keyword));
  
  // Add points for menu keywords found
  score += keywordsFound.length * 0.5;
  
  // Check for price patterns
  const priceMatches = text.match(/\$\d+(\.\d{1,2})?|\d+(\.\d{1,2})?€|\d+(\.\d{1,2})?/g) || [];
  score += Math.min(5, priceMatches.length * 0.2);
  
  // Check for category diversity
  const categories = new Set(menuItems.filter(item => item.category).map(item => item.category));
  score += Math.min(5, categories.size);
  
  return Math.min(10, score);
}

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Request body:', event.body);
    const requestBody = JSON.parse(event.body || '{}');
    const { imageUrl } = requestBody;
    
    console.log('Image URL:', imageUrl);
    
    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }
    
    // Get the Hugging Face API token from environment variables
    const apiToken = process.env.HUGGING_FACE_API_TOKEN;
    if (!apiToken) {
      console.error('Missing Hugging Face API token');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: Missing API token' })
      };
    }
    
    console.log('Calling LayoutLMv3 model...');
    
    // Call Hugging Face Inference API with LayoutLMv3
    const startTime = Date.now();
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/microsoft/layoutlmv3-base',
      { inputs: { image: imageUrl } },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    const processingTime = Date.now() - startTime;
    console.log('LayoutLMv3 response received in', processingTime, 'ms');
    
    // Extract text from the response
    let layoutOutput = response.data;
    let extractedText = '';
    
    if (layoutOutput && layoutOutput.text) {
      extractedText = layoutOutput.text;
    } else if (layoutOutput && Array.isArray(layoutOutput)) {
      // Handle potential array response format
      extractedText = layoutOutput.map(item => item.text || '').join('\n');
      layoutOutput = { text: extractedText };
    } else {
      console.warn('Unexpected LayoutLMv3 response format:', layoutOutput);
      extractedText = JSON.stringify(layoutOutput);
      layoutOutput = { text: extractedText };
    }
    
    console.log('Extracted text length:', extractedText.length);
    
    // Process the extracted text to identify menu items
    const menuItems = processMenuItems(layoutOutput);
    console.log('Menu items extracted:', menuItems.length);
    
    // Calculate menu quality score
    const menuScore = calculateMenuScore(extractedText, menuItems);
    
    // Create a formatted response for compatibility with existing code
    const formattedResponse = [{
      generated_text: extractedText
    }];
    
    // Add debugging information
    const debugInfo = {
      model: 'microsoft/layoutlmv3-base',
      menuScore: menuScore,
      textLength: extractedText.length,
      extractedItems: menuItems.length,
      processingTimeMs: processingTime,
      bestModel: 'microsoft/layoutlmv3-base'
    };
    
    console.log('LayoutLMv3 processing completed successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result: formattedResponse,
        menuItems: menuItems,
        debug: debugInfo
      })
    };
  } catch (error) {
    console.error('LayoutLMv3 API error:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    // Prepare error details
    let errorDetails = {
      message: error.message
    };
    
    // Add response data if available
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
      errorDetails.status = error.response.status;
      errorDetails.data = error.response.data;
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error processing image with LayoutLMv3',
        details: errorDetails
      })
    };
  }
};
