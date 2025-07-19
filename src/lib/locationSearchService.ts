import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

// Interface for location search results
export interface LocationResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  confidence: number;
  city: string;
  country: string;
  placeType: 'restaurant' | 'cafe' | 'bar' | 'food_court' | 'bakery' | 'unknown';
}

// Interface for search parameters
export interface LocationSearchParams {
  restaurantName: string;
  city?: string;
  country?: string;
  additionalContext?: string;
}

export class LocationSearchService {
  private llm: ChatOllama;
  private parser: StringOutputParser;

  constructor() {
    // Initialize Ollama model - using the same endpoint as your existing setup
    this.llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5:7b', // Using a lighter model for location search
      temperature: 0.1, // Low temperature for more consistent results
    });
    
    this.parser = new StringOutputParser();
  }

  /**
   * Search for restaurant location using LangChain and local knowledge
   */
  async searchLocation(params: LocationSearchParams): Promise<LocationResult | null> {
    try {
      const prompt = PromptTemplate.fromTemplate(`
You are a location search assistant. Given a restaurant name and optional context, provide location information in JSON format.

Instructions:
- Return ONLY valid JSON, no other text
- If you cannot find the location with high confidence, return null
- Focus on exact matches and well-known establishments
- Include confidence score from 0.0 to 1.0

Restaurant Name: {restaurantName}
City: {city}
Country: {country}
Additional Context: {additionalContext}

Required JSON format:
{{
  "name": "Restaurant Name",
  "address": "Full street address",
  "latitude": 00.0000,
  "longitude": 00.0000,
  "confidence": 0.95,
  "city": "City Name",
  "country": "Country Name",
  "placeType": "restaurant|cafe|bar|food_court|bakery|unknown"
}}

If not found, return: null
`);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        this.parser,
      ]);

      const response = await chain.invoke({
        restaurantName: params.restaurantName,
        city: params.city || 'unknown',
        country: params.country || 'unknown',
        additionalContext: params.additionalContext || 'none',
      });

      // Parse the JSON response
      const cleanedResponse = response.trim();
      
      if (cleanedResponse === 'null' || cleanedResponse === '') {
        return null;
      }

      try {
        const locationData = JSON.parse(cleanedResponse);
        
        // Validate the response structure
        if (this.isValidLocationResult(locationData)) {
          return locationData as LocationResult;
        } else {
          console.warn('Invalid location result structure:', locationData);
          return null;
        }
      } catch (parseError) {
        console.error('Failed to parse location search response:', parseError);
        console.error('Raw response:', cleanedResponse);
        return null;
      }

    } catch (error) {
      console.error('Location search failed:', error);
      return null;
    }
  }

  /**
   * Enhanced search with fallback using OpenStreetMap Nominatim API
   */
  async searchLocationWithFallback(params: LocationSearchParams): Promise<LocationResult | null> {
    // First try LangChain-based search
    const llmResult = await this.searchLocation(params);
    
    if (llmResult && llmResult.confidence > 0.7) {
      return llmResult;
    }

    // Fallback to OpenStreetMap Nominatim API for real location data
    try {
      const searchQuery = this.buildNominatimQuery(params);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'MenuMap-Location-Search/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results = await response.json();
      
      if (results && results.length > 0) {
        const bestMatch = results[0];
        
        return {
          name: params.restaurantName,
          address: bestMatch.display_name,
          latitude: parseFloat(bestMatch.lat),
          longitude: parseFloat(bestMatch.lon),
          confidence: 0.8,
          city: params.city || this.extractCity(bestMatch.display_name),
          country: params.country || this.extractCountry(bestMatch.display_name),
          placeType: this.inferPlaceType(params.restaurantName, bestMatch.type)
        };
      }

      return llmResult; // Return LLM result even if confidence is lower
    } catch (error) {
      console.error('Nominatim fallback failed:', error);
      return llmResult; // Return LLM result as last resort
    }
  }

  /**
   * Batch search for multiple restaurant names
   */
  async batchSearchLocations(restaurants: LocationSearchParams[]): Promise<(LocationResult | null)[]> {
    const results: (LocationResult | null)[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);
      const batchPromises = batch.map(restaurant => 
        this.searchLocationWithFallback(restaurant)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful to APIs
      if (i + batchSize < restaurants.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Validate if the location result has the required structure
   */
  private isValidLocationResult(data: any): boolean {
    return (
      data &&
      typeof data.name === 'string' &&
      typeof data.address === 'string' &&
      typeof data.latitude === 'number' &&
      typeof data.longitude === 'number' &&
      typeof data.confidence === 'number' &&
      typeof data.city === 'string' &&
      typeof data.country === 'string' &&
      typeof data.placeType === 'string' &&
      data.confidence >= 0 &&
      data.confidence <= 1 &&
      data.latitude >= -90 &&
      data.latitude <= 90 &&
      data.longitude >= -180 &&
      data.longitude <= 180
    );
  }

  /**
   * Build search query for Nominatim API
   */
  private buildNominatimQuery(params: LocationSearchParams): string {
    let query = params.restaurantName;
    
    if (params.city) {
      query += `, ${params.city}`;
    }
    
    if (params.country) {
      query += `, ${params.country}`;
    }
    
    // Add restaurant/food related terms to improve search accuracy
    query += ' restaurant OR cafe OR food';
    
    return query;
  }

  /**
   * Extract city from display name
   */
  private extractCity(displayName: string): string {
    const parts = displayName.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 3]?.trim() || parts[1]?.trim() || 'Unknown';
    }
    return 'Unknown';
  }

  /**
   * Extract country from display name
   */
  private extractCountry(displayName: string): string {
    const parts = displayName.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
  }

  /**
   * Infer place type from restaurant name and OSM type
   */
  private inferPlaceType(restaurantName: string, osmType?: string): LocationResult['placeType'] {
    const name = restaurantName.toLowerCase();
    
    if (name.includes('cafe') || name.includes('coffee')) {
      return 'cafe';
    }
    
    if (name.includes('bar') || name.includes('pub')) {
      return 'bar';
    }
    
    if (name.includes('bakery') || name.includes('bake')) {
      return 'bakery';
    }
    
    if (name.includes('food court') || name.includes('court')) {
      return 'food_court';
    }
    
    // Default to restaurant
    return 'restaurant';
  }
}

// Export singleton instance
export const locationSearchService = new LocationSearchService();