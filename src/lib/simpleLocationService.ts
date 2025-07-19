// Simple location search service using only OpenStreetMap Nominatim API
export interface LocationResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  confidence: number;
  city: string;
  country: string;
  placeType: 'restaurant' | 'cafe' | 'bar' | 'food_court' | 'bakery' | 'unknown';
  source: 'nominatim';
}

export interface LocationSearchParams {
  restaurantName: string;
  city?: string;
  country?: string;
  additionalContext?: string;
}

export class SimpleLocationService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org/search';
  private static readonly USER_AGENT = 'MenuMap-Location-Search/1.0';
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private static lastRequestTime = 0;

  /**
   * Search for restaurant location using only Nominatim API
   */
  static async searchLocation(params: LocationSearchParams): Promise<LocationResult | null> {
    try {
      // Rate limiting - Nominatim requires max 1 request per second
      await this.respectRateLimit();

      const searchQuery = this.buildSearchQuery(params);
      const url = `${this.BASE_URL}?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results = await response.json();
      
      if (!results || results.length === 0) {
        return null;
      }

      // Find the best match
      const bestMatch = this.findBestMatch(results, params.restaurantName);
      
      if (!bestMatch) {
        return null;
      }

      return this.formatResult(bestMatch, params.restaurantName);

    } catch (error) {
      console.error('Location search failed:', error);
      return null;
    }
  }

  /**
   * Batch search for multiple restaurant names
   */
  static async batchSearchLocations(restaurants: LocationSearchParams[]): Promise<(LocationResult | null)[]> {
    const results: (LocationResult | null)[] = [];
    
    // Process sequentially to respect rate limits
    for (const restaurant of restaurants) {
      const result = await this.searchLocation(restaurant);
      results.push(result);
      
      // Additional delay for batch operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Build search query optimized for finding restaurants
   */
  private static buildSearchQuery(params: LocationSearchParams): string {
    let query = params.restaurantName;
    
    // Add location context if provided
    if (params.city) {
      query += `, ${params.city}`;
    }
    
    if (params.country) {
      query += `, ${params.country}`;
    }
    
    return query;
  }

  /**
   * Find the best match from Nominatim results
   */
  private static findBestMatch(results: any[], restaurantName: string): any | null {
    const normalizedName = restaurantName.toLowerCase();
    
    // First, try to find exact or close matches
    for (const result of results) {
      const displayName = result.display_name?.toLowerCase() || '';
      const resultName = result.name?.toLowerCase() || '';
      
      // Check if restaurant name appears in the result
      if (displayName.includes(normalizedName) || resultName.includes(normalizedName)) {
        // Prefer results that are clearly food-related
        if (this.isFoodRelated(result)) {
          return result;
        }
      }
    }

    // Fallback: return the first food-related result
    for (const result of results) {
      if (this.isFoodRelated(result)) {
        return result;
      }
    }

    // Last resort: return the first result
    return results[0] || null;
  }

  /**
   * Check if a Nominatim result is food-related
   */
  private static isFoodRelated(result: any): boolean {
    const type = result.type?.toLowerCase() || '';
    const category = result.category?.toLowerCase() || '';
    const displayName = result.display_name?.toLowerCase() || '';
    
    const foodKeywords = [
      'restaurant', 'cafe', 'coffee', 'bar', 'pub', 'bistro', 
      'pizzeria', 'bakery', 'food', 'dining', 'eatery', 'grill',
      'kitchen', 'diner', 'tavern', 'brewery', 'winery'
    ];
    
    return foodKeywords.some(keyword => 
      type.includes(keyword) || 
      category.includes(keyword) || 
      displayName.includes(keyword)
    );
  }

  /**
   * Format Nominatim result to our standard format
   */
  private static formatResult(result: any, originalName: string): LocationResult {
    return {
      name: originalName, // Use the original search name
      address: result.display_name || 'Address not available',
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      confidence: this.calculateConfidence(result, originalName),
      city: this.extractCity(result),
      country: this.extractCountry(result),
      placeType: this.inferPlaceType(originalName, result.type),
      source: 'nominatim'
    };
  }

  /**
   * Calculate confidence score based on result quality
   */
  private static calculateConfidence(result: any, originalName: string): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for food-related results
    if (this.isFoodRelated(result)) {
      confidence += 0.3;
    }
    
    // Boost confidence if name appears in display name
    const displayName = result.display_name?.toLowerCase() || '';
    const searchName = originalName.toLowerCase();
    if (displayName.includes(searchName)) {
      confidence += 0.2;
    }
    
    // Boost confidence for specific place types
    const type = result.type?.toLowerCase() || '';
    if (type === 'restaurant' || type === 'cafe') {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Extract city from Nominatim result
   */
  private static extractCity(result: any): string {
    const address = result.address || {};
    return address.city || 
           address.town || 
           address.village || 
           address.municipality || 
           'Unknown City';
  }

  /**
   * Extract country from Nominatim result
   */
  private static extractCountry(result: any): string {
    const address = result.address || {};
    return address.country || 'Unknown Country';
  }

  /**
   * Infer place type from name and OSM data
   */
  private static inferPlaceType(restaurantName: string, osmType?: string): LocationResult['placeType'] {
    const name = restaurantName.toLowerCase();
    const type = osmType?.toLowerCase() || '';
    
    if (name.includes('cafe') || name.includes('coffee') || type.includes('cafe')) {
      return 'cafe';
    }
    
    if (name.includes('bar') || name.includes('pub') || type.includes('bar') || type.includes('pub')) {
      return 'bar';
    }
    
    if (name.includes('bakery') || name.includes('bake') || type.includes('bakery')) {
      return 'bakery';
    }
    
    if (name.includes('food court') || name.includes('court')) {
      return 'food_court';
    }
    
    // Default to restaurant
    return 'restaurant';
  }

  /**
   * Respect Nominatim rate limiting (max 1 request per second)
   */
  private static async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delayNeeded = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    this.lastRequestTime = Date.now();
  }
}

// Export singleton instance
export const simpleLocationService = new SimpleLocationService();