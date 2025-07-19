import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const testRestaurants = [
    'Noma',
    'Geranium',
    'Alchemist',
    'McDonald\'s',
    'Starbucks',
    'Pizza Hut',
    'Joe & The Juice',
    'Cafe Central',
    'Restaurant Krebsegaarden',
    'Madklubben'
  ];

  try {
    // Test the location search with a few well-known restaurants
    const testRestaurant = url.searchParams.get('restaurant') || testRestaurants[0];
    const city = url.searchParams.get('city') || 'Copenhagen';
    const country = url.searchParams.get('country') || 'Denmark';

    console.log(`Testing location search for: ${testRestaurant} in ${city}, ${country}`);

    const response = await fetch(`${url.origin}/api/location-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantName: testRestaurant,
        city,
        country,
        additionalContext: 'Test search from API endpoint'
      }),
    });

    const searchResult = await response.json();

    return json({
      success: true,
      testParams: {
        restaurant: testRestaurant,
        city,
        country
      },
      searchResult,
      availableTestRestaurants: testRestaurants,
      instructions: {
        usage: 'Use ?restaurant=NAME&city=CITY&country=COUNTRY to test specific locations',
        examples: [
          `${url.origin}/api/test-location-search?restaurant=Noma&city=Copenhagen&country=Denmark`,
          `${url.origin}/api/test-location-search?restaurant=McDonald's&city=New York&country=USA`,
          `${url.origin}/api/test-location-search?restaurant=Cafe Central&city=Vienna&country=Austria`
        ]
      }
    });

  } catch (error) {
    console.error('Test location search failed:', error);
    return json(
      { 
        error: 'Test failed', 
        details: error.message,
        instructions: 'Make sure Ollama is running on localhost:11434 with qwen2.5:7b model loaded'
      },
      { status: 500 }
    );
  }
};