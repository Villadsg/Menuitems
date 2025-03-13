import axios from 'axios';

/**
 * Menu Structure Analysis Serverless Function
 * Uses Mistral LLM to analyze OCR text and extract structured menu data
 */
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
    const requestBody = JSON.parse(event.body || '{}');
    const { ocrText } = requestBody;
    
    if (!ocrText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'OCR text is required' })
      };
    }
    
    // Get the Mistral API token from environment variables
    const apiToken = process.env.MISTRAL_API_KEY;
    if (!apiToken) {
      console.error('Missing Mistral API token');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: Missing API token' })
      };
    }
    
    console.log('Calling Mistral LLM API for menu structure analysis...');
    const startTime = Date.now();
    
    // Create a system prompt that instructs the LLM how to analyze menu structure
    const systemPrompt = `
      You are a specialized menu structure analyzer. Your task is to analyze OCR text from restaurant menus and extract structured information.
      
      For each menu section or category:
      1. Identify section headings (typically in all caps, larger font, or followed by a list of items)
      2. For each menu item, extract:
         - Item name
         - Price
         - Description (ingredients, preparation method, allergens, etc.)
      
      Format your response as a JSON object with the following structure:
      {
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
      
      If you cannot identify sections, use "Uncategorized" as the section name.
      If an item has no description, use an empty string.
      If an item has no price, use null.
    `;
    
    // Use a more cost-effective model and implement retry logic with exponential backoff
    let response;
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second initial delay
    
    while (retries <= maxRetries) {
      try {
        // Make the API call to Mistral LLM with a more cost-effective model
        response = await axios.post(
          'https://api.mistral.ai/v1/chat/completions',
          {
            model: "mistral-medium", // Using medium model instead of large for cost savings
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
            max_tokens: 4000
          },
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );
        
        // If we get here, the request was successful
        break;
      } catch (error) {
        retries++;
        
        // Check if it's a rate limit error
        if (error.response && error.response.status === 429) {
          if (retries <= maxRetries) {
            // Calculate delay with exponential backoff (1s, 2s, 4s, etc.)
            const delay = baseDelay * Math.pow(2, retries - 1);
            console.log(`Rate limit exceeded. Retrying in ${delay}ms (attempt ${retries} of ${maxRetries})`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error(`Rate limit exceeded. Max retries (${maxRetries}) reached.`);
            throw error;
          }
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log('Mistral LLM response received in', processingTime, 'ms');
    
    // Extract the LLM response
    const llmResponse = response.data;
    if (!llmResponse.choices || llmResponse.choices.length === 0) {
      console.error('Invalid LLM response:', llmResponse);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid response from Mistral LLM API',
          details: llmResponse
        })
      };
    }
    
    // Get the content from the LLM response
    const content = llmResponse.choices[0].message.content;
    
    // Parse the JSON from the content
    // The LLM might include markdown code blocks, so we need to extract just the JSON
    let menuStructure;
    try {
      // Try to find JSON in the response (it might be wrapped in ```json ... ```)
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                        content.match(/({[\s\S]*})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      menuStructure = JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing LLM response as JSON:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse menu structure from LLM response',
          llmResponse: content
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        menuStructure,
        processingTimeMs: processingTime
      })
    };
  } catch (error) {
    console.error('Menu structure analysis error:', error.message);
    
    // Prepare error details
    let errorDetails = {
      message: error.message
    };
    
    // Add response data if available
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      errorDetails.status = error.response.status;
      errorDetails.data = error.response.data;
    }
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Menu structure analysis failed',
        details: errorDetails
      })
    };
  }
};
