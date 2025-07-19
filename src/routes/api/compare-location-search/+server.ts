import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const testRestaurants = [
    { name: 'Noma', city: 'Copenhagen', country: 'Denmark' },
    { name: 'McDonald\'s', city: 'Copenhagen', country: 'Denmark' },
    { name: 'Joe & The Juice', city: 'Copenhagen', country: 'Denmark' },
    { name: 'Starbucks', city: 'New York', country: 'USA' },
    { name: 'Pizza Hut', city: 'London', country: 'UK' }
  ];

  const restaurant = url.searchParams.get('restaurant') || 'Noma';
  const city = url.searchParams.get('city') || 'Copenhagen';
  const country = url.searchParams.get('country') || 'Denmark';

  try {
    console.log(`Comparing search methods for: ${restaurant} in ${city}, ${country}`);

    // Test both approaches
    const [langchainResult, nominatimResult] = await Promise.allSettled([
      // LangChain + Ollama approach
      fetch(`${url.origin}/api/location-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurant,
          city,
          country
        })
      }).then(r => r.json()),

      // Nominatim-only approach
      fetch(`${url.origin}/api/simple-location-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurant,
          city,
          country
        })
      }).then(r => r.json())
    ]);

    const analysis = {
      testQuery: { restaurant, city, country },
      langchainApproach: {
        status: langchainResult.status,
        result: langchainResult.status === 'fulfilled' ? langchainResult.value : null,
        error: langchainResult.status === 'rejected' ? langchainResult.reason.message : null,
        pros: [
          'Can understand context and fuzzy matching',
          'May find locations even with incomplete data',
          'Can leverage AI reasoning for ambiguous cases'
        ],
        cons: [
          'Requires Ollama running locally',
          'More complex setup and dependencies',
          'Slower response times',
          'May hallucinate locations that don\'t exist',
          'Higher resource usage'
        ]
      },
      nominatimApproach: {
        status: nominatimResult.status,
        result: nominatimResult.status === 'fulfilled' ? nominatimResult.value : null,
        error: nominatimResult.status === 'rejected' ? nominatimResult.reason.message : null,
        pros: [
          'Real geographical data from OpenStreetMap',
          'No local dependencies required',
          'Fast and reliable',
          'Free to use with rate limiting',
          'Always returns actual locations',
          'Simpler implementation'
        ],
        cons: [
          'Requires exact or close name matches',
          'May miss locations with very different names',
          'Rate limited (1 request per second)',
          'Less intelligent about context'
        ]
      }
    };

    return json({
      success: true,
      comparison: analysis,
      recommendation: {
        summary: 'For your use case, Nominatim-only is probably better',
        reasoning: [
          'You\'re dealing with real restaurants that exist in OpenStreetMap',
          'Exact location data is more important than fuzzy matching',
          'Simpler implementation and maintenance',
          'No risk of AI hallucinations',
          'Better performance and reliability'
        ],
        whenToUseLangChain: [
          'When you have very incomplete or ambiguous restaurant names',
          'When you need to infer locations from descriptions',
          'When you have non-standard naming conventions',
          'When you need to match historical or informal names'
        ]
      },
      testRestaurants,
      nextSteps: [
        '1. Try both endpoints with your real restaurant names',
        '2. Check accuracy of results against known locations',
        '3. Consider your specific data quality and requirements',
        '4. If Nominatim works well, remove LangChain dependencies'
      ]
    });

  } catch (error) {
    console.error('Comparison test failed:', error);
    return json(
      { 
        error: 'Comparison test failed', 
        details: error.message
      },
      { status: 500 }
    );
  }
};