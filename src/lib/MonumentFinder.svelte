<script lang="ts">
  import { databases, storage } from '$lib/appwrite'; // Import the initialized Appwrite client
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation'; // Import the goto function from SvelteKit

  let status = '';
  let page = 'home';
  const databaseId = '6609473fbde756e5dc45';  // Use your actual database ID
  const collectionId = '66eefaaf001c2777deb9';  // Use your actual collection ID
  const bucketId = '66efdb420000df196b64'; 

  let monuments = [];
  let sortedMonuments = [];

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
          id: doc.$id, // Include the document ID
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
    const a = 0.5 - Math.cos(dLat) / 2 + 
              Math.cos(lat1 * Math.PI / 180) * 
              Math.cos(lat2 * Math.PI / 180) * 
              (1 - Math.cos(dLon)) / 2;
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

  // Success callback when geolocation is retrieved
  const success = (position: GeolocationPosition) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    status = `Latitude: ${latitude}, Longitude: ${longitude}`;

    // Calculate distances for all monuments
    sortedMonuments = monuments
      .map(monument => {
        const distance = calculateDistance(latitude, longitude, monument.lat, monument.lng);
        return { ...monument, distance };
      })
      // Sort by distance in ascending order
      .sort((a, b) => a.distance - b.distance);

    page = 'results';
  };

  // Error callback if geolocation fails
  const error = () => {
    status = 'Unable to retrieve your location';
  };

  // Function to handle monument selection
  const selectMonument = (monument) => {
    // Navigate to the new page with the monument's ID
    goto(`/play?id=${monument.id}`);
  };

  onMount(async () => {
    await loadMonuments(); // Fetch monuments from the Appwrite database when the component mounts
  });
</script>

<!-- Home Page -->
{#if page === 'home'}
  <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-gray-700 mb-4">Find the tours nearby</h1>
    <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" on:click={findLocation}>Use My Location</button>
    <p class="mt-4 text-gray-600">{status}</p>
  </div>
{/if}

<!-- Results Page -->
{#if page === 'results'}
  <div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
    {#if sortedMonuments.length > 0}
      {#each sortedMonuments as monument}
        <div class="mb-4 p-4 bg-gray-100 rounded shadow">
          <h3 class="text-xl font-semibold text-gray-800">{monument.name}</h3>
          {#if monument.photoUrl}
            <img src="{monument.photoUrl}" alt="{monument.name}" class="my-2 max-w-xs rounded shadow" />
          {/if}
          <p class="text-gray-500">Distance: {monument.distance.toFixed(2)} km</p>
          <button
            class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-2"
            on:click={() => selectMonument(monument)}
          >
            Select
          </button>
        </div>
      {/each}
    {:else}
      <p>No monuments found.</p>
    {/if}
    <button
      class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 mt-4"
      on:click={() => (page = 'home')}
    >
      Back to Home
    </button>
  </div>
{/if}
