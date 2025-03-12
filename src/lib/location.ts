// src/lib/location.ts

// Copenhagen coordinates as default when geolocation is not available
export const DEFAULT_LOCATION = {
  latitude: 55.6761, // Copenhagen latitude
  longitude: 12.5683 // Copenhagen longitude
};

// Utility to calculate the distance between two coordinates using the Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    0.5 - Math.cos(dLat) / 2 + 
    Math.cos(lat1 * Math.PI / 180) * 
    Math.cos(lat2 * Math.PI / 180) * 
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Get user's current location or return Copenhagen as default
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser, using default location (Copenhagen)');
      resolve(DEFAULT_LOCATION);
    } else {
      const timeoutId = setTimeout(() => {
        console.warn('Geolocation request timed out, using default location (Copenhagen)');
        resolve(DEFAULT_LOCATION);
      }, 5000); // 5 second timeout

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn(`Unable to retrieve location: ${error.message}, using default location (Copenhagen)`);
          resolve(DEFAULT_LOCATION);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  });
}