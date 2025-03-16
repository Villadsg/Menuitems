import axios from 'axios';

/**
 * Utility function to check if an image file starts with the appropriate signature bytes
 * @param {Uint8Array} bytes - The image file data as bytes
 * @param {string} format - The image format to check ('jpeg', 'png', etc.)
 * @returns {boolean} True if the bytes match the expected signature
 */
function checkImageSignature(bytes, format) {
  if (!bytes || bytes.length < 8) return false;
  
  if (format.toLowerCase() === 'jpeg') {
    // JPEG signature: FF D8 FF
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  } else if (format.toLowerCase() === 'png') {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
           bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
  }
  
  return false;
}

/**
 * OCR Serverless Function for Vercel
 * This function processes images using the Mistral OCR API
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
    console.log('Request body received');
    const { imageUrl, backupImageUrl } = req.body;
    
    console.log('Image URL:', imageUrl);
    console.log('Backup URL available:', backupImageUrl ? 'Yes' : 'No');
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Get the API token from environment variables
    const apiToken = process.env.MISTRAL_API_KEY;
    if (!apiToken) {
      console.error('Missing API token');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing API token. Please ensure MISTRAL_API_KEY is set in Vercel environment variables.'
      });
    }
    
    console.log('Calling OCR API...');
    const startTime = Date.now();
    
    // Make the API call using exactly the format from the documentation
    const response = await axios.post(
      'https://api.mistral.ai/v1/ocr',
      {
        model: 'mistral-ocr-latest',
        document: {
          type: 'image_url',
          image_url: imageUrl
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000 // 25 second timeout (less than Vercel's limit)
      }
    );
    
    console.log('Received successful response from OCR API');
    
    const processingTime = Date.now() - startTime;
    console.log('OCR response received in', processingTime, 'ms');
    
    // Extract text from the response
    const ocrData = response.data;
    
    // Ensure we have a valid response
    if (!ocrData || !ocrData.pages || !Array.isArray(ocrData.pages) || ocrData.pages.length === 0) {
      console.error('Invalid OCR response:', ocrData);
      return res.status(500).json({ 
        error: 'Invalid OCR response from API',
        details: ocrData
      });
    }
    
    // Log the entire response structure to understand what we're getting
    console.log('Raw OCR response structure:', Object.keys(ocrData));
    
    // Extract text from the response - specifically handling the response format
    let extractedText = '';
    
    // The OCR API returns a 'pages' array with 'markdown' field for each page
    if (ocrData.pages && Array.isArray(ocrData.pages)) {
      console.log('Response contains pages array with', ocrData.pages.length, 'pages');
      
      for (const page of ocrData.pages) {
        console.log('Page properties:', Object.keys(page));
        
        // Extract text from the markdown field (this is the format used)
        if (page.markdown) {
          console.log('Found text in page.markdown (standard format)');
          extractedText += page.markdown + '\n\n';
        } 
        // Fallback to other potential fields if markdown is not present
        else if (page.text) {
          console.log('Found text in page.text');
          extractedText += page.text + '\n\n';
        } else if (page.content) {
          console.log('Found text in page.content');
          extractedText += page.content + '\n\n';
        }
      }
    }
    // Fallbacks for other possible formats
    else if (ocrData.text) {
      console.log('Found text in root response object');
      extractedText = ocrData.text;
    } else if (ocrData.markdown) {
      console.log('Found markdown in root response object');
      extractedText = ocrData.markdown;
    }
    
    console.log('Final extracted text length:', extractedText.length);
    if (extractedText.length > 0) {
      console.log('First 100 chars of extracted text:', extractedText.substring(0, 100));
    } else {
      console.log('WARNING: No text was extracted from the OCR response');
    }
    
    return res.status(200).json({
      text: extractedText,
      model: ocrData.model,
      processingTimeMs: processingTime
    });
  } catch (error) {
    console.error('OCR API error:', error.message);
    
    // Prepare error details
    let errorDetails = {
      message: error.message
    };
    
    // Add response data if available
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      errorDetails.status = error.response.status;
      errorDetails.data = error.response.data;
      
      // Special handling for 422 errors (unprocessable entity)
      if (error.response.status === 422) {
        console.error('422 Unprocessable Entity Error - This usually means the request format is incorrect');
        console.error('API might be rejecting the image format or structure');
        const userMessage = 'The image could not be processed by the OCR service. Please try a different image format or quality.';
        errorDetails.imageFormatIssue = true;
        errorDetails.userMessage = userMessage;
      }
      
      return res.status(error.response.status).json({ 
        error: 'OCR API error',
        details: errorDetails
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from OCR API');
      return res.status(504).json({ 
        error: 'Timeout connecting to OCR API',
        message: 'Request timed out. Please try again with a smaller image.'
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({ 
        error: 'OCR API error',
        details: errorDetails
      });
    }
  }
}
