import axios from 'axios';

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
    console.log('Environment variables:', process.env.HUGGING_FACE_API_TOKEN ? 'Token exists' : 'No token');
    
    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }
    
    // Get the Hugging Face API token from environment variables
    const apiToken = process.env.HUGGING_FACE_API_TOKEN || process.env.VITE_HUGGING_FACE_API_TOKEN;
    if (!apiToken) {
      console.error('Missing Hugging Face API token');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: Missing API token' })
      };
    }
    
    // Try multiple OCR models to get the best result
    const models = [
      'microsoft/trocr-large-printed',   // Good for printed text
      'facebook/nougat-base',            // Good for complex document layouts
      'microsoft/trocr-base-printed',    // Another good option
      'microsoft/trocr-small-printed'    // Smaller, faster model as last resort
    ];
    
    // These models are specialized for OCR and should provide good results
    // for menu text extraction
    
    let bestResponse = null;
    let bestText = '';
    let allResponses = {};
    
    // Try each model until we get a good result
    for (const model of models) {
    try {
      console.log(`Calling Hugging Face API with model: ${model}...`);
      
      // Configure payload based on the specific model
      let payload;
      
      if (model.includes('trocr') || model.includes('nougat')) {
        // Standard OCR models
        payload = { inputs: imageUrl };
      } else {
        // Generic payload for other models
        payload = { inputs: imageUrl };
      }
      
      // Add a reasonable timeout to prevent hanging requests
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000 // 25 second timeout
        }
      );
      
      console.log(`API response status for ${model}:`, response.status);
      console.log(`API response data for ${model}:`, JSON.stringify(response.data));
      
      // Extract text from the response - handle different model response formats
      let extractedText = '';
      
      console.log(`Raw response from ${model}:`, JSON.stringify(response.data));
      
      // Handle different response formats based on model type
      if (typeof response.data === 'string') {
        // Some models return plain text
        extractedText = response.data;
      } else if (response.data && response.data.generated_text) {
        // Some models return { generated_text: "..." }
        extractedText = response.data.generated_text;
      } else if (Array.isArray(response.data) && response.data[0]) {
        // Some models return an array of results
        if (response.data[0].generated_text) {
          extractedText = response.data[0].generated_text;
        } else if (response.data[0].text) {
          extractedText = response.data[0].text;
        } else if (typeof response.data[0] === 'string') {
          extractedText = response.data[0];
        }
      } else if (response.data && response.data.text) {
        // Some models use 'text' instead of 'generated_text'
        extractedText = response.data.text;
      } else {
        // Last resort: stringify the response
        extractedText = JSON.stringify(response.data);
      }
      
      // Check if the extracted text is likely to be OCR content and not an image description
      const isLikelyImageDescription = (
        extractedText.toLowerCase().includes('a person') ||
        extractedText.toLowerCase().includes('holding') ||
        extractedText.toLowerCase().includes('picture of') ||
        extractedText.toLowerCase().includes('image of') ||
        extractedText.toLowerCase().includes('photo of')
      );
      
      // Store the response data
      allResponses[model] = {
        status: response.status,
        text: extractedText,
        isLikelyImageDescription
      };
      
      // Only consider this as a good result if it doesn't look like an image description
      if (!isLikelyImageDescription) {
        // Check if the text looks like a menu (contains common menu keywords)
        const menuKeywords = ['menu', 'appetizer', 'entree', 'dessert', 'special', 'price', '$', '€', 'dish', 'soup', 'salad'];
        const lowerText = extractedText.toLowerCase();
        const menuKeywordCount = menuKeywords.filter(keyword => lowerText.includes(keyword)).length;
        const menuScore = menuKeywordCount + (extractedText.length / 100); // Length is also a factor
        
        console.log(`Model ${model} menu score: ${menuScore} (${menuKeywordCount} keywords)`);
        
        // If this is the first valid response or it has a better menu score, update the best
        const currentBestScore = bestText ? 
          menuKeywords.filter(keyword => bestText.toLowerCase().includes(keyword)).length + (bestText.length / 100) : 
          -1;
          
        if (!bestResponse || menuScore > currentBestScore) {
          console.log(`New best model: ${model} (score: ${menuScore} vs previous: ${currentBestScore})`);
          bestResponse = response;
          bestText = extractedText;
        }
        
        // If we got a very good result, break the loop
        if (menuScore > 5 && extractedText.length > 100) {
          console.log(`Found excellent OCR result from model: ${model}`);
          break;
        }
      } else {
        console.log(`Model ${model} returned an image description, not OCR text. Skipping.`);
      }
    } catch (error) {
      console.error(`Error with model ${model}:`, error.message);
      
      // Log detailed error information for debugging
      if (error.response) {
        console.error(`Response status for ${model}:`, error.response.status);
        console.error(`Response data for ${model}:`, JSON.stringify(error.response.data));
      }
      
      // Prepare error response
      let errorMessage = 'Error processing image with OCR';
      let errorDetails = {};
      
      // Handle specific error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'OCR processing timed out';
        errorDetails = { timeout: true, timeoutMs: 25000 };
      } else if (error.response && error.response.status === 429) {
        errorMessage = 'Rate limit exceeded for OCR API';
        errorDetails = { rateLimited: true };
      } else if (error.response && error.response.status === 503) {
        errorMessage = 'Hugging Face API service is temporarily unavailable';
        errorDetails = { serviceUnavailable: true };
      } else if (error.message.includes('TimeoutError')) {
        errorMessage = 'OCR model loading timed out';
        errorDetails = { modelTimeout: true };
      } else if (error.message.includes('status code 503')) {
        errorMessage = 'Hugging Face API service is temporarily unavailable';
        errorDetails = { serviceUnavailable: true };
      }
      
      allResponses[model] = {
        error: errorMessage,
        status: error.response ? error.response.status : 'unknown',
        data: error.response ? error.response.data : null,
        details: errorDetails
      };
      
      // Continue to the next model instead of returning an error immediately
      console.log(`Continuing to next model after error with ${model}`);
    }
  }
    
    // If we didn't get any successful responses, return an error
    if (!bestResponse) {
      console.log('All models failed to extract text');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to extract text from image with all OCR models',
          modelResponses: allResponses
        })
      };
    }
    
    // Make sure bestText is a string
    if (typeof bestText !== 'string') {
      bestText = String(bestText);
    }
    
    // Process the extracted text to identify menu items
    const menuItems = processMenuText(bestText);
    
    // Create a formatted response with the expected structure
    const formattedResponse = [{
      generated_text: bestText
    }];
    
    // Add debugging information
    const bestModel = Object.keys(allResponses).find(model => 
      allResponses[model].text === bestText
    );
    
    // Calculate the menu score for the best model
    const menuKeywords = ['menu', 'appetizer', 'entree', 'dessert', 'special', 'price', '$', '€', 'dish', 'soup', 'salad'];
    const menuKeywordCount = menuKeywords.filter(keyword => bestText.toLowerCase().includes(keyword)).length;
    const menuScore = menuKeywordCount + (bestText.length / 100);
    
    const debugInfo = {
      modelResponses: allResponses,
      bestModel: bestModel,
      menuScore: menuScore.toFixed(2),
      menuKeywords: menuKeywordCount,
      textLength: bestText.length,
      extractedItems: menuItems.length
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result: formattedResponse,
        menuItems: menuItems,  // Include the processed menu items
        debug: debugInfo
      })
    };
  } catch (error) {
    console.error('OCR API error:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error processing image with OCR',
        message: error.message,
        details: error.response ? error.response.data : null
      })
    };
  }
};

// Enhanced menu text processing function
function processMenuText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const lines = text.split('\n').filter(line => line.trim());
  const menuItems = [];
  let currentCategory = 'Uncategorized';
  let pendingItem = null;
  
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
  const categoryRegex = new RegExp(`^(${sectionHeaders.join('|')}|[A-Z\s&]+)$`);
  const priceRegex = /\$\d+(\.\d{1,2})?|\d+(\.\d{1,2})?€|\d+(\.\d{1,2})?(\s?USD|\s?EUR)?/g;
  
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
    const priceMatches = [...line.matchAll(priceRegex)];
    
    if (priceMatches.length > 0) {
      // This is likely a menu item with price
      const priceMatch = priceMatches[priceMatches.length - 1]; // Take the last price in the line
      const price = priceMatch[0];
      const priceIndex = priceMatch.index;
      
      // Extract name and description
      let name = line.substring(0, priceIndex).trim();
      let description = line.substring(priceIndex + price.length).trim();
      
      // Check if the next line might be a continuation of the description
      if (i < lines.length - 1 && !priceRegex.test(lines[i+1]) && 
          !categoryRegex.test(lines[i+1]) && !lines[i+1].endsWith(':')) {
        description += ' ' + lines[i+1].trim();
        i++; // Skip the next line since we've incorporated it
      }
      
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
