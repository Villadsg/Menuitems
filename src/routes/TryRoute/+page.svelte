//empty
<script lang="ts">
import { databases, storage } from '$lib/appwrite'; // Import the initialized Appwrite client
import { onMount } from 'svelte';

let status = '';
let monumentListHtml = '';
let page = 'home'; // Track current page ('home', 'results', 'quiz')
const databaseId = '6609473fbde756e5dc45';  // Use your actual database ID
const collectionId = '66eefaaf001c2777deb9';  // Use your actual collection ID
const bucketId = '66efdb420000df196b64'; // Your Appwrite bucket ID
const MAX_DISTANCE_KM = 100;  // Set the max distance to 100 km

let monuments = [];

const loadMonuments = async () => {
  try {
    const response = await databases.listDocuments(databaseId, collectionId);
    monuments = await Promise.all(response.documents.map(async (doc) => {
      let photoUrl = null;

      if (doc.photoFileId) {
        // Get the file preview URL from Appwrite storage
        photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
      }

      return {
        name: doc.Route_name,
        lat: doc.lat,
        lng: doc.lng,
        photoUrl  // Include the photoUrl
      };
    }));
  } catch (error) {
    console.error("Error loading monuments:", error);
  }
};

// Calculate distance between two coordinates using the Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Handle "Find My Location" button click
const findLocation = () => {
  if (!navigator.geolocation) {
    status = 'Geolocation is not supported by your browser';
    return;
  }
  status = 'Locating…';
  navigator.geolocation.getCurrentPosition(success, error);
};

</script>