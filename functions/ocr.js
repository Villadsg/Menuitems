const axios = require('axios');

exports.handler = async (event, context) => {
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
    const { imageUrl } = JSON.parse(event.body);
    
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
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }
    
    // Call Hugging Face Inference API
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/stepfun-ai/GOT-OCR2_0',
      { inputs: { image: imageUrl } },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Process the OCR result
    const result = response.data;
    
    // Extract menu items from the OCR text
    const menuItems = processMenuText(result[0].generated_text);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        menuItems,
        rawText: result[0].generated_text
      })
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process image with OCR' })
    };
  }
};

/**
 * Process raw OCR text into structured menu items
 * @param {string} text Raw OCR text
 * @returns {Array} Structured menu items
 */
function processMenuText(text) {
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
