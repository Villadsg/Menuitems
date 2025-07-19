# Location Search Integration with LangChain

This document describes the new location search functionality that has been integrated into the MenuMap application using LangChain and Ollama.

## Overview

The location search system automatically finds restaurant/cafe locations based on their names using:
1. **LangChain + Ollama** for intelligent location inference
2. **OpenStreetMap Nominatim API** as a fallback for real geographical data
3. **Enhanced OCR processing** that combines menu text extraction with location discovery

## Components Added

### 1. Core Services

#### `LocationSearchService` (`src/lib/locationSearchService.ts`)
- Main service class for location search operations
- Uses Ollama qwen2.5:7b model via LangChain for intelligent location inference
- Fallback to OpenStreetMap Nominatim API for real geographical data
- Supports batch processing and confidence scoring

#### `EnhancedOCRService` (`src/lib/enhancedOcrService.ts`)
- Extends the existing OCR functionality
- Automatically searches for restaurant locations after menu text extraction
- Combines EXIF GPS data, LangChain inference, and external APIs
- Supports backfilling existing restaurant data with location information

### 2. API Endpoints

#### `/api/location-search` (GET/POST)
- Main endpoint for location searches
- Supports single restaurant searches and batch operations
- Returns structured location data with confidence scores

#### `/api/backfill-locations` (GET/POST)
- Administrative endpoint for updating existing restaurant records
- Supports dry-run mode for previewing changes
- Provides statistics about location data coverage

#### `/api/test-location-search` (GET)
- Simple test endpoint for verifying the location search functionality
- Includes example restaurant queries

### 3. Frontend Components

#### `LocationSearchWidget.svelte`
- Reusable search widget with autocomplete functionality
- Debounced search with loading states
- Advanced search options (city/country filtering)
- Event-driven architecture for easy integration

#### Admin Interface (`/admin/location-search`)
- Dashboard for managing location search operations
- Statistics overview of location data coverage
- Interactive testing interface
- Backfill management with progress tracking

## Installation & Setup

### 1. Install Dependencies

The following packages have been added to `package.json`:

```bash
npm install @langchain/core @langchain/community @langchain/ollama langchain
```

### 2. Ollama Setup

Ensure Ollama is running with the required model:

```bash
# Install Ollama if not already installed
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the required model
ollama pull qwen2.5:7b

# Start Ollama (should run on localhost:11434)
ollama serve
```

### 3. Database Schema Updates

The location search system uses these additional fields in the `restaurants` table:

```sql
-- Add these columns to your restaurants table if they don't exist
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS location_data JSONB;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS location_search_status TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;
```

## Usage Examples

### 1. Basic Location Search

```typescript
import { locationSearchService } from '$lib/locationSearchService';

const result = await locationSearchService.searchLocationWithFallback({
  restaurantName: 'Noma',
  city: 'Copenhagen',
  country: 'Denmark'
});

if (result) {
  console.log(`Found: ${result.name} at ${result.latitude}, ${result.longitude}`);
}
```

### 2. Enhanced OCR with Location

```typescript
import { EnhancedOCRService } from '$lib/enhancedOcrService';

const result = await EnhancedOCRService.processMenuImageWithLocation(
  'image-file-id',
  'photos',
  {
    city: 'Copenhagen',
    country: 'Denmark'
  }
);

console.log('Menu items:', result.menuItems);
console.log('Location data:', result.locationData);
```

### 3. Batch Processing

```typescript
const restaurants = [
  { imageFileId: 'image1', city: 'Copenhagen' },
  { imageFileId: 'image2', city: 'Stockholm' }
];

const results = await EnhancedOCRService.batchProcessMenusWithLocation(restaurants);
```

### 4. Backfill Existing Data

```typescript
const backfillResult = await EnhancedOCRService.backfillRestaurantLocations({
  limit: 50,
  onlyMissingCoordinates: true,
  onProgress: (processed, total) => {
    console.log(`Progress: ${processed}/${total}`);
  }
});
```

## API Reference

### Location Search Response Format

```typescript
interface LocationResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  confidence: number; // 0.0 to 1.0
  city: string;
  country: string;
  placeType: 'restaurant' | 'cafe' | 'bar' | 'food_court' | 'bakery' | 'unknown';
}
```

### Enhanced OCR Response Format

```typescript
interface EnhancedMenuResult extends MenuOCRResult {
  locationData?: LocationResult;
  locationSearchStatus: 'found' | 'not_found' | 'error' | 'skipped';
  locationSearchSource?: 'llm' | 'nominatim';
  coordinates?: {
    latitude: number;
    longitude: number;
    source: 'exif' | 'location_search' | 'manual';
  };
}
```

## Testing

### 1. Test the API Endpoints

```bash
# Test basic location search
curl "http://localhost:5173/api/test-location-search?restaurant=Noma&city=Copenhagen&country=Denmark"

# Get location statistics
curl "http://localhost:5173/api/backfill-locations?action=stats"

# Test search widget
# Visit: http://localhost:5173/admin/location-search
```

### 2. Frontend Testing

The admin interface at `/admin/location-search` provides:
- Interactive search testing
- Database statistics
- Backfill operations with dry-run mode

## Configuration

### Environment Variables

```bash
# Optional: Override default Ollama configuration
QWEN_VL_BASE_URL=http://localhost:11434
QWEN_VL_MODEL=qwen2.5:7b
QWEN_VL_TIMEOUT=30000
```

### LangChain Configuration

The system is configured to use:
- **Model**: qwen2.5:7b (lighter model for location tasks)
- **Temperature**: 0.1 (low for consistent results)
- **Fallback**: OpenStreetMap Nominatim API
- **Rate limiting**: Built-in delays for API respectful usage

## Integration with Existing Workflow

### Automatic Integration

The enhanced OCR service can be dropped in as a replacement for the existing OCR service:

```typescript
// Instead of:
const result = await OCRService.processMenuImage(imageFileId);

// Use:
const result = await EnhancedOCRService.processMenuImageWithLocation(imageFileId, 'photos', {
  city: userCity, // optional
  country: userCountry // optional
});
```

### Manual Integration

For existing menu uploads, use the backfill functionality:

```typescript
// Update specific restaurant
await EnhancedOCRService.updateRestaurantWithLocation(restaurantId, {
  restaurantName: 'Restaurant Name'
});

// Bulk update
await EnhancedOCRService.backfillRestaurantLocations({
  limit: 100,
  onlyMissingCoordinates: true
});
```

## Performance Considerations

1. **Rate Limiting**: Built-in delays prevent API overload
2. **Batch Processing**: Processes multiple items efficiently
3. **Caching**: Results are stored in the database to avoid repeated searches
4. **Fallback Strategy**: Multiple data sources ensure high success rates
5. **Confidence Scoring**: Helps filter unreliable results

## Troubleshooting

### Common Issues

1. **Ollama not running**: Ensure `ollama serve` is running on port 11434
2. **Model not found**: Run `ollama pull qwen2.5:7b`
3. **API rate limits**: Reduce batch size or increase delays
4. **Low confidence results**: Use the Nominatim fallback results instead

### Debug Mode

Enable detailed logging by setting `NODE_ENV=development` to see:
- LangChain prompt and response details
- API call traces
- Confidence score calculations
- Fallback activation logs

## Future Enhancements

1. **Vector Embeddings**: Add semantic similarity search for restaurant names
2. **User Feedback**: Allow users to correct location data
3. **Multiple Data Sources**: Integrate Google Places API, Foursquare, etc.
4. **Real-time Updates**: WebSocket progress updates for long-running operations
5. **Machine Learning**: Train custom models on successful location matches