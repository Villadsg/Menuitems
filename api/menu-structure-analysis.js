import axios from 'axios';

/**
 * Menu Structure Analysis Serverless Function for Vercel
 * Uses Mistral LLM to analyze OCR text and extract structured menu data
 * This version is optimized for Vercel's serverless environment
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ocrText } = req.body;
    
    if (!ocrText) {
      return res.status(400).json({ error: 'OCR text is required' });
    }
    
    // Get the Mistral API token from environment variables
    const apiToken = process.env.MISTRAL_API_KEY;
    if (!apiToken) {
      console.error('Missing Mistral API token');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing API token. Please ensure MISTRAL_API_KEY is set in Vercel environment variables.'
      });
    }
    
    console.log('Calling Mistral LLM API for menu structure analysis...');
    const startTime = Date.now();
    
    // Create a system prompt that instructs the LLM how to analyze menu structure
    const systemPrompt = `
      You are a specialized menu structure analyzer. Your task is to analyze OCR text from restaurant menus and extract structured information.
      
      CRITICAL INSTRUCTIONS:
      - ONLY extract items that ACTUALLY EXIST in the provided text
      - DO NOT generate fictional menu items or categories
      - DO NOT try to convert non-menu text into a menu structure
      - If the text does not appear to be from a restaurant menu, return an empty structure with a note
      
      Pay special attention to these common OCR issues:
      1. Price formatting problems:
         - Missing decimal points (e.g., "1299" should be "12.99")
         - Inconsistent decimal notation (using commas instead of periods)
         - Missing currency symbols
      
      2. Ingredient attribution issues:
         - Correctly attribute ingredients/descriptions to their specific menu items
         - Distinguish between shared descriptions and item-specific descriptions
         - IMPORTANT: When a description applies to multiple items, include it with each relevant item
         - Look for patterns like "all served with..." or groups of items with the same price
      
      For each menu section or category:
      1. Identify section headings (typically in all caps, larger font, or followed by a list of items)
      2. For each menu item, extract:
         - Item name (be precise about where the name ends and description begins)
         - Price (ensure correct decimal formatting)
         - Description (ingredients, preparation method, allergens, etc. that belong ONLY to this item)
      
      Common menu patterns to watch for:
      - Some menus list ingredients after each item name
      - Some menus have shared descriptions for a group of items (DUPLICATE this shared description for EACH item)
      - Items with the same price in a category often share descriptions or preparation methods
      - Descriptions containing phrases like "all served with", "comes with", or "choice of" typically apply to multiple items
      - Prices may appear in various formats ($12.99, 12,99€, etc.)
      - Descriptions often follow the item name and precede the price
      
      Format your response as a JSON object with the following structure:
      {
        "isMenu": true|false,
        "restaurantName": "Name of restaurant if found, otherwise null",
        "menuSections": [
          {
            "sectionName": "APPETIZERS",
            "items": [
              {
                "name": "Calamari",
                "price": "$12.99",
                "description": "Lightly fried and served with marinara sauce"
              },
              ...
            ]
          },
          ...
        ]
      }
      
      If the text does not appear to be from a menu, set "isMenu": false and return an empty "menuSections" array.
      If you cannot identify sections, use "Uncategorized" as the section name.
      If an item has no description, use an empty string.
      If an item has no price, use null.
    `;
    
    // Use a smaller, faster model and implement optimized timeout handling
    let response;
    try {
      // Set a more aggressive timeout for the API call
      response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: "mistral-small", // Using smaller model for faster processing
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Analyze the following menu OCR text and extract structured information:\n\n${ocrText}`
            }
          ],
          temperature: 0.1, // Low temperature for more deterministic results
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000 // 25 second timeout (less than Vercel's limit)
        }
      );
    } catch (error) {
      console.error('Mistral API error:', error.message);
      
      // Enhanced error handling
      if (error.response) {
        // The request was made and the server responded with a non-2xx status
        console.error('Error response data:', error.response.data);
        return res.status(500).json({ 
          error: `Mistral API error: ${error.response.status}`,
          details: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
        return res.status(504).json({ 
          error: 'Timeout connecting to Mistral API',
          message: 'Request timed out. Please try again with a simpler image.'
        });
      } else {
        // Something happened in setting up the request
        return res.status(500).json({ 
          error: 'Failed to connect to Mistral API',
          message: error.message
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log('Mistral LLM response received in', processingTime, 'ms');
    
    // Extract the LLM response
    const llmResponse = response.data;
    if (!llmResponse.choices || llmResponse.choices.length === 0) {
      console.error('Invalid LLM response:', llmResponse);
      return res.status(500).json({ 
        error: 'Invalid response from Mistral LLM API',
        details: llmResponse
      });
    }
    
    // Get the content from the LLM response
    const content = llmResponse.choices[0].message.content;
    
    // Parse the JSON from the content
    let menuStructure;
    try {
      // Try to find JSON in the response (it might be wrapped in ```json ... ```)
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                        content.match(/({[\s\S]*})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      menuStructure = JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing LLM response as JSON:', error);
      return res.status(500).json({ 
        error: 'Failed to parse menu structure from LLM response',
        llmResponse: content
      });
    }
    
    return res.status(200).json({
      menuStructure,
      processingTimeMs: processingTime
    });
  } catch (error) {
    console.error('Menu structure analysis error:', error.message);
    return res.status(500).json({
      error: 'Menu structure analysis failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
