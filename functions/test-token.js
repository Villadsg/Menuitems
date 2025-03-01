import axios from 'axios';

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    // Get all environment variables (sanitized)
    const envVars = {};
    for (const key in process.env) {
      if (key.includes('HUGGING') || key.includes('TOKEN')) {
        envVars[key] = process.env[key] ? `${process.env[key].substring(0, 4)}...` : 'undefined';
      }
    }
    
    // Test the Hugging Face API token
    const apiToken = process.env.HUGGING_FACE_API_TOKEN || process.env.VITE_HUGGING_FACE_API_TOKEN;
    let tokenStatus = 'No token found';
    
    if (apiToken) {
      try {
        // Make a simple request to the Hugging Face API to check if the token is valid
        const response = await axios.get(
          'https://huggingface.co/api/whoami',
          {
            headers: {
              Authorization: `Bearer ${apiToken}`
            }
          }
        );
        
        tokenStatus = response.status === 200 ? 'Valid token' : `Invalid token (status: ${response.status})`;
      } catch (error) {
        tokenStatus = `Error validating token: ${error.message}`;
        if (error.response) {
          tokenStatus += ` (status: ${error.response.status})`;
        }
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Environment test',
        envVars,
        tokenStatus
      })
    };
  } catch (error) {
    console.error('Test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error testing environment',
        message: error.message
      })
    };
  }
};
