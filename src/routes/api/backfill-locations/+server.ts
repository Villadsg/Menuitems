import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EnhancedOCRService } from '$lib/enhancedOcrService';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { 
      limit = 50, 
      onlyMissingCoordinates = true,
      dryRun = false 
    } = body;

    // Validate input
    if (limit < 1 || limit > 100) {
      return json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    let processedCount = 0;
    const progressCallback = (processed: number, total: number) => {
      processedCount = processed;
      // In a real application, you might want to use WebSockets or Server-Sent Events
      // to provide real-time progress updates to the client
    };

    if (dryRun) {
      // For dry run, just return what would be processed without actually doing it
      const { data: restaurants, error } = await import('$lib/supabase').then(m => m.supabase)
        .from('restaurants')
        .select('id, route_name, ocrdata, lat, lng, location_search_status')
        .not('route_name', 'is', null)
        .limit(limit);

      if (error) {
        return json(
          { error: 'Failed to fetch restaurants for dry run', details: error.message },
          { status: 500 }
        );
      }

      let filteredRestaurants = restaurants || [];
      if (onlyMissingCoordinates) {
        filteredRestaurants = filteredRestaurants.filter(r => 
          !r.lat || !r.lng || !r.location_search_status
        );
      }

      return json({
        success: true,
        dryRun: true,
        wouldProcess: filteredRestaurants.length,
        restaurants: filteredRestaurants.map(r => ({
          id: r.id,
          name: r.route_name || r.ocrdata?.restaurantName || 'Unknown',
          hasCoordinates: !!(r.lat && r.lng),
          locationSearchStatus: r.location_search_status
        }))
      });
    }

    // Perform the actual backfill
    const result = await EnhancedOCRService.backfillRestaurantLocations({
      limit,
      onlyMissingCoordinates,
      onProgress: progressCallback
    });

    return json({
      success: true,
      ...result,
      message: `Processed ${result.processed} restaurants. ${result.successful} successful, ${result.failed} failed.`
    });

  } catch (error) {
    console.error('Backfill locations API error:', error);
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
    const action = url.searchParams.get('action');
    
    if (action === 'stats') {
      // Return statistics about restaurants and their location data
      const { supabase } = await import('$lib/supabase');
      
      const [
        { count: totalRestaurants },
        { count: withCoordinates },
        { count: withLocationSearch },
        { count: missingLocation }
      ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).not('lat', 'is', null).not('lng', 'is', null),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('location_search_status', 'found'),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).or('lat.is.null,lng.is.null,location_search_status.is.null')
      ]);

      return json({
        success: true,
        stats: {
          totalRestaurants: totalRestaurants || 0,
          withCoordinates: withCoordinates || 0,
          withLocationSearch: withLocationSearch || 0,
          missingLocation: missingLocation || 0,
          coordinatesPercentage: totalRestaurants ? Math.round((withCoordinates / totalRestaurants) * 100) : 0,
          locationSearchPercentage: totalRestaurants ? Math.round((withLocationSearch / totalRestaurants) * 100) : 0
        }
      });
    }

    return json(
      { error: 'Invalid action parameter. Use ?action=stats for statistics.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Backfill locations GET API error:', error);
    return json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
};