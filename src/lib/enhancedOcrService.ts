import { OCRService, type MenuOCRResult } from './ocrService';
import { locationSearchService, type LocationResult, type LocationSearchParams } from './locationSearchService';
import { supabase } from './supabase';

export interface EnhancedMenuResult extends MenuOCRResult {
  locationData?: LocationResult;
  locationSearchStatus: 'found' | 'not_found' | 'error' | 'skipped';
  locationSearchSource?: 'llm' | 'nominatim';
  coordinates?: {
    latitude: number;
    longitude: number;
    source: 'exif' | 'location_search' | 'manual';
  };
}

export class EnhancedOCRService {
  
  /**
   * Process menu image with OCR and automatic location search
   */
  static async processMenuImageWithLocation(
    imageFileId: string, 
    bucketId: string = 'photos',
    options: {
      skipLocationSearch?: boolean;
      city?: string;
      country?: string;
      additionalContext?: string;
    } = {}
  ): Promise<EnhancedMenuResult> {
    
    try {
      // First, run the standard OCR processing
      console.log('Starting OCR processing...');
      const ocrResult = await OCRService.processMenuImage(imageFileId, bucketId);
      
      // Initialize enhanced result
      const enhancedResult: EnhancedMenuResult = {
        ...ocrResult,
        locationSearchStatus: 'skipped'
      };

      // Extract coordinates from EXIF data if available
      const exifCoordinates = await this.extractExifCoordinates(imageFileId, bucketId);
      if (exifCoordinates) {
        enhancedResult.coordinates = {
          latitude: exifCoordinates.latitude,
          longitude: exifCoordinates.longitude,
          source: 'exif'
        };
      }

      // Skip location search if requested or no restaurant name found
      if (options.skipLocationSearch || !ocrResult.restaurantName) {
        console.log('Skipping location search:', {
          skipRequested: options.skipLocationSearch,
          noRestaurantName: !ocrResult.restaurantName
        });
        return enhancedResult;
      }

      // Perform location search
      console.log('Starting location search for:', ocrResult.restaurantName);
      try {
        const searchParams: LocationSearchParams = {
          restaurantName: ocrResult.restaurantName,
          city: options.city,
          country: options.country,
          additionalContext: options.additionalContext
        };

        const locationResult = await locationSearchService.searchLocationWithFallback(searchParams);
        
        if (locationResult) {
          enhancedResult.locationData = locationResult;
          enhancedResult.locationSearchStatus = 'found';
          enhancedResult.locationSearchSource = locationResult.confidence > 0.8 ? 'nominatim' : 'llm';
          
          // If no EXIF coordinates, use location search coordinates
          if (!enhancedResult.coordinates) {
            enhancedResult.coordinates = {
              latitude: locationResult.latitude,
              longitude: locationResult.longitude,
              source: 'location_search'
            };
          }
          
          console.log('Location found:', {
            name: locationResult.name,
            confidence: locationResult.confidence,
            source: enhancedResult.locationSearchSource
          });
        } else {
          enhancedResult.locationSearchStatus = 'not_found';
          console.log('Location not found for restaurant:', ocrResult.restaurantName);
        }
        
      } catch (locationError) {
        console.error('Location search failed:', locationError);
        enhancedResult.locationSearchStatus = 'error';
      }

      return enhancedResult;
      
    } catch (error) {
      console.error('Enhanced OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple menu images with location search
   */
  static async batchProcessMenusWithLocation(
    imageFiles: Array<{
      imageFileId: string;
      bucketId?: string;
      city?: string;
      country?: string;
      additionalContext?: string;
    }>,
    options: {
      maxConcurrent?: number;
      skipLocationSearch?: boolean;
    } = {}
  ): Promise<EnhancedMenuResult[]> {
    
    const maxConcurrent = options.maxConcurrent || 3;
    const results: EnhancedMenuResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < imageFiles.length; i += maxConcurrent) {
      const batch = imageFiles.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(file => 
        this.processMenuImageWithLocation(
          file.imageFileId,
          file.bucketId,
          {
            skipLocationSearch: options.skipLocationSearch,
            city: file.city,
            country: file.country,
            additionalContext: file.additionalContext
          }
        ).catch(error => {
          console.error(`Failed to process ${file.imageFileId}:`, error);
          // Return a partial result on error
          return {
            menuItems: [],
            restaurantName: undefined,
            rawText: '',
            locationSearchStatus: 'error' as const
          };
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrent < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Update existing restaurant records with location data
   */
  static async updateRestaurantWithLocation(
    restaurantId: string,
    searchParams: LocationSearchParams
  ): Promise<LocationResult | null> {
    
    try {
      const locationResult = await locationSearchService.searchLocationWithFallback(searchParams);
      
      if (locationResult) {
        // Update the restaurant record in the database
        const { error } = await supabase
          .from('restaurants')
          .update({
            lat: locationResult.latitude,
            lng: locationResult.longitude,
            location_data: locationResult,
            location_search_status: 'found',
            location_updated_at: new Date().toISOString()
          })
          .eq('id', restaurantId);

        if (error) {
          console.error('Failed to update restaurant location:', error);
          return null;
        }

        console.log(`Updated restaurant ${restaurantId} with location data`);
        return locationResult;
      }

      // Update status even if not found
      await supabase
        .from('restaurants')
        .update({
          location_search_status: 'not_found',
          location_updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId);

      return null;
      
    } catch (error) {
      console.error('Location update failed:', error);
      
      // Update status to error
      await supabase
        .from('restaurants')
        .update({
          location_search_status: 'error',
          location_updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId);
        
      return null;
    }
  }

  /**
   * Search for restaurants that need location data and update them
   */
  static async backfillRestaurantLocations(
    options: {
      limit?: number;
      onlyMissingCoordinates?: boolean;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: Array<{
      id: string;
      restaurantName: string;
      success: boolean;
      locationData?: LocationResult;
    }>;
  }> {
    
    const limit = options.limit || 50;
    const onlyMissingCoordinates = options.onlyMissingCoordinates || true;
    
    // Find restaurants that need location data
    let query = supabase
      .from('restaurants')
      .select('id, route_name, ocrdata, lat, lng, location_search_status')
      .not('route_name', 'is', null)
      .limit(limit);

    if (onlyMissingCoordinates) {
      query = query.or('lat.is.null,lng.is.null,location_search_status.is.null');
    }

    const { data: restaurants, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch restaurants: ${error.message}`);
    }

    const results = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const restaurant of restaurants || []) {
      try {
        const restaurantName = restaurant.route_name || 
          (restaurant.ocrdata?.restaurantName) || 
          'Unknown Restaurant';

        const locationResult = await this.updateRestaurantWithLocation(
          restaurant.id,
          { restaurantName }
        );

        const success = locationResult !== null;
        
        results.push({
          id: restaurant.id,
          restaurantName,
          success,
          locationData: locationResult || undefined
        });

        if (success) {
          successful++;
        } else {
          failed++;
        }

      } catch (error) {
        console.error(`Failed to update restaurant ${restaurant.id}:`, error);
        results.push({
          id: restaurant.id,
          restaurantName: restaurant.route_name || 'Unknown',
          success: false
        });
        failed++;
      }

      processed++;
      options.onProgress?.(processed, restaurants.length);

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      processed,
      successful,
      failed,
      results
    };
  }

  /**
   * Extract coordinates from image EXIF data
   */
  private static async extractExifCoordinates(
    imageFileId: string, 
    bucketId: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    
    try {
      // This would need the exifr library that's already in your dependencies
      const { data } = supabase.storage.from(bucketId).getPublicUrl(imageFileId);
      const imageUrl = data.publicUrl;
      
      // Import exifr dynamically to avoid SSR issues
      const { default: exifr } = await import('exifr');
      
      const exifData = await exifr.parse(imageUrl, {
        gps: true,
        pick: ['latitude', 'longitude']
      });

      if (exifData?.latitude && exifData?.longitude) {
        return {
          latitude: exifData.latitude,
          longitude: exifData.longitude
        };
      }

      return null;
      
    } catch (error) {
      console.log('EXIF extraction failed (this is normal for most images):', error.message);
      return null;
    }
  }
}

export default EnhancedOCRService;