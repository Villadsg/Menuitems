<script lang="ts">
  import { page } from '$app/stores';  // To access the query parameters
  import { onMount } from 'svelte';   // To run loadMonuments when the component mounts
  import { databases, storage } from '$lib/appwrite';  // Appwrite services

  let latitude = null;
  let longitude = null;
  let language = null;
  let closestMonument = null;
  let monuments = [];

  const databaseId = '6609473fbde756e5dc45';  // Use your actual database ID
  const collectionId = '66eefaaf001c2777deb9';  // Use your actual collection ID
  const bucketId = '66efdb420000df196b64';  // Replace with your Appwrite collection ID



  
  // Retrieve user location and language from the URL query params
  $: if ($page.url.searchParams) {
    latitude = parseFloat($page.url.searchParams.get('lat'));
    longitude = parseFloat($page.url.searchParams.get('lng'));
    language = $page.url.searchParams.get('lang');
  }

  // Function to load monuments and find the closest one
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
          lat: parseFloat(doc.lat),
          lng: parseFloat(doc.lng),
          photoUrl  // Include the photoUrl
        };
      }));

      // Once monuments are loaded, find the closest one
      findClosestMonument();
    } catch (error) {
      console.error("Error loading monuments:", error);
    }
  };

  // Function to calculate distance between user and a monument using Haversine formula
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // Function to find the closest monument based on user's location
  const findClosestMonument = () => {
    if (!latitude || !longitude || monuments.length === 0) return;

    let closest = null;
    let minDistance = Infinity;

    for (const monument of monuments) {
      const distance = calculateDistance(latitude, longitude, monument.lat, monument.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closest = monument;
      }
    }

    closestMonument = closest;
  };

  // Load monuments when the component mounts
  onMount(() => {
    loadMonuments();
  });
</script>

<div class="pt-40">
  {#if closestMonument}
    <h1>The Closest Monument:</h1>
    <div>
      <h2>{closestMonument.name}</h2>
      <p>Latitude: {closestMonument.lat}, Longitude: {closestMonument.lng}</p>
      {#if closestMonument.photoUrl}
        <img src={closestMonument.photoUrl} alt="Monument Photo" />
      {/if}
    </div>
  {:else}
    <p>Loading closest monument...</p>
  {/if}
</div>
