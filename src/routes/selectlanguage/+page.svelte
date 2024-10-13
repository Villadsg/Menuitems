<script lang="ts">
  import { getCurrentLocation, calculateDistance } from '$lib/location'; // Import location utilities
  import { goto } from '$app/navigation';
  import { databases, storage } from '$lib/appwrite'; 
  import { Query } from 'appwrite';
  import DistanceCheck from '$lib/distanceCheck.svelte'; // Import the DistanceCheck component

  let language = 'english'; // Default language
  let latitude: number | null = null;
  let longitude: number | null = null;
  let locationError = '';
  let isLoading = false;
  let closestMonument = null;
  let monuments = [];
  let showDistanceCheck = false; // Boolean to show the DistanceCheck component
  let distanceFromMonument = 0; // Track distance to the monument

  const databaseId = '6609473fbde756e5dc45';
  const collectionIdEnglish = '66eefaaf001c2777deb9';
  const translatedCollectionId = '66fe6ac90010d9e9602f'; 
  const bucketId = '66efdb420000df196b64';

  const submitLanguage = async () => {
    isLoading = true;

    try {
      const location = await getCurrentLocation(); // Use location utility to get user's location
      latitude = location.latitude;
      longitude = location.longitude;

      await loadMonuments(); // Load monuments
      findClosestMonument(); // Find closest monument

      if (closestMonument) {
        // Calculate the distance to the closest monument
        distanceFromMonument = calculateDistance(latitude, longitude, closestMonument.lat, closestMonument.lng);
        
        if (distanceFromMonument > 1) {
          showDistanceCheck = true; // Show the DistanceCheck component if the distance is greater than 200 meters
        } else {
          // Navigate to the closest monument's quiz page
          goto(`/play?id=${closestMonument.id}&lang=${language}`);
        }
      } else {
        locationError = 'No nearby monuments found.';
      }
    } catch (error) {
      locationError = error.message;
    } finally {
      isLoading = false;
    }
  };

  // Load monuments from the Appwrite database
  const loadMonuments = async () => {
    const currentCollectionId = language === 'english' ? collectionIdEnglish : translatedCollectionId;
    const response = await databases.listDocuments(databaseId, currentCollectionId,
      language === 'english' ? [] : [Query.equal('language', language)]
    );
    monuments = await Promise.all(response.documents.map(async (doc) => {
      let photoUrl = null;
      if (doc.photoFileId) {
        photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
      }
      return {
        id: doc.$id,
        name: doc.Route_name,
        lat: parseFloat(doc.lat),
        lng: parseFloat(doc.lng),
        photoUrl,
      };
    }));
  };

  // Use the utility function to find the closest monument
  const findClosestMonument = () => {
    if (latitude === null || longitude === null || monuments.length === 0) return;

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

  const continueNavigation = () => {
    showDistanceCheck = false; // Hide the DistanceCheck component
    goto(`/play?id=${closestMonument.id}&lang=${language}`); // Continue to the monument's quiz page
  };

  const cancelNavigation = () => {
    showDistanceCheck = false; // Hide the DistanceCheck component and stay on the current page
  };
</script>

{#if showDistanceCheck}
  <DistanceCheck distance={distanceFromMonument} onContinue={continueNavigation} onCancel={cancelNavigation} />
{/if}

<!-- Rest of your page layout remains the same -->
<div class="flex items-start justify-center h-full bg-opacity-50 pt-40">
  <!-- Your form and button to select language -->
  <div class="max-w-xl mx-auto p-8">
    <h1 class="text-2xl font-bold mb-4">Which language are you learning?</h1>
    <div class="mb-4">
      <label for="language" class="font-bold">Select Language:</label>
      <select id="language" bind:value={language} class="p-2 border rounded w-full">
        <option value="english">English</option>
        <option value="ES">Spanish</option>
        <option value="IT">Italian</option>
        <option value="JA">Japanese</option>
        <option value="DA">Danish</option>
      </select>
    </div>

    {#if locationError}
      <p class="text-red-500">{locationError}</p>
    {/if}

    <button on:click={submitLanguage} class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded w-full" disabled={isLoading}>
      {#if isLoading}
        <div class="custom-spinner mr-2"></div>
        Loading...
      {:else}
        Find the closest route
      {/if}
    </button>
  </div>
</div>
