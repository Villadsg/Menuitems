import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { locationSearchService, type LocationSearchParams } from '$lib/locationSearchService';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { restaurantName, city, country, additionalContext, batch } = body;

    // Validate input
    if (!restaurantName && !batch) {
      return json(
        { error: 'Restaurant name or batch data is required' },
        { status: 400 }
      );
    }

    // Handle batch search
    if (batch && Array.isArray(batch)) {
      try {
        const results = await locationSearchService.batchSearchLocations(batch);
        return json({
          success: true,
          results,
          count: results.length,
          successful: results.filter(r => r !== null).length
        });
      } catch (error) {
        console.error('Batch location search failed:', error);
        return json(
          { error: 'Batch location search failed', details: error.message },
          { status: 500 }
        );
      }
    }

    // Handle single search
    if (typeof restaurantName !== 'string' || restaurantName.trim().length === 0) {
      return json(
        { error: 'Valid restaurant name is required' },
        { status: 400 }
      );
    }

    const searchParams: LocationSearchParams = {
      restaurantName: restaurantName.trim(),
      city: city?.trim(),
      country: country?.trim(),
      additionalContext: additionalContext?.trim()
    };

    const result = await locationSearchService.searchLocationWithFallback(searchParams);

    if (result) {
      return json({
        success: true,
        result,
        source: result.confidence > 0.8 ? 'nominatim' : 'llm'
      });
    } else {
      return json({
        success: false,
        result: null,
        message: 'Location not found'
      });
    }

  } catch (error) {
    console.error('Location search API error:', error);
    return json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const restaurantName = url.searchParams.get('name');
    const city = url.searchParams.get('city');
    const country = url.searchParams.get('country');
    const additionalContext = url.searchParams.get('context');

    if (!restaurantName) {
      return json(
        { error: 'Restaurant name parameter is required' },
        { status: 400 }
      );
    }

    const searchParams: LocationSearchParams = {
      restaurantName: restaurantName.trim(),
      city: city?.trim(),
      country: country?.trim(),
      additionalContext: additionalContext?.trim()
    };

    const result = await locationSearchService.searchLocationWithFallback(searchParams);

    if (result) {
      return json({
        success: true,
        result,
        source: result.confidence > 0.8 ? 'nominatim' : 'llm'
      });
    } else {
      return json({
        success: false,
        result: null,
        message: 'Location not found'
      });
    }

  } catch (error) {
    console.error('Location search API error:', error);
    return json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
};