import { json } from '@sveltejs/kit';
import axios from 'axios';
import type { RequestHandler } from './$types';

/**
 * POST handler for OCR API
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const requestBody = await request.json();
    const { imageUrl, backupImageUrl } = requestBody;
    
    console.log('Image URL:', imageUrl);
    console.log('Backup URL available:', backupImageUrl ? 'Yes' : 'No');
    
    if (!imageUrl) {
      return json({ error: 'Image URL is required' }, { status: 400 });
    }
    
    // Get the API token from environment variables
    const apiToken = process.env.MISTRAL_API_KEY;
    if (!apiToken) {
      console.error('Missing API token');
      return json({ error: 'Server configuration error: Missing API token' }, { status: 500 });
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
        timeout: 30000 // 30 second timeout
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
      return json({ 
        error: 'Invalid OCR response from API',
        details: ocrData
      }, { status: 500 });
    }
    
    // Extract text from the response - specifically handling the response format
    let extractedText = '';
    
    // The OCR API returns a 'pages' array with 'markdown' field for each page
    if (ocrData.pages && Array.isArray(ocrData.pages)) {
      console.log('Response contains pages array with', ocrData.pages.length, 'pages');
      
      for (const page of ocrData.pages) {
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
    
    return json({
      text: extractedText,
      model: ocrData.model,
      processingTimeMs: processingTime
    });
  } catch (error: unknown) {
    console.error('OCR API error:', error instanceof Error ? error.message : 'Unknown error');
    
    // Prepare error details
    let errorDetails: Record<string, any> = {
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    // Add response data if available - handle axios error type
    if (error && typeof error === 'object' && 'response' in error && error.response) {
      const axiosError = error as { response: { status: number, data: any } };
      console.error('Error response status:', axiosError.response.status);
      console.error('Error response data:', JSON.stringify(axiosError.response.data, null, 2));
      errorDetails.status = axiosError.response.status;
      errorDetails.data = axiosError.response.data;
    }
    
    return json({ 
      error: 'OCR API error', 
      details: errorDetails 
    }, { status: 500 });
  }
};
