<script lang="ts">
  import { selectedLanguage } from '$lib/languageStore';
  import { goto } from '$app/navigation';
  import { databases, storage } from '$lib/appwrite'; // Import Appwrite services

  let language = 'english'; // Default language
  let latitude = null;
  let longitude = null;
  let locationError = '';
  let isLoading = false;  // State to manage loading
  let closestMonument = null;
  let monuments = [];

  const databaseId = '6609473fbde756e5dc45';  // Your actual database ID
  const collectionId = '66eefaaf001c2777deb9';  // Your actual collection ID
  const bucketId = '66efdb420000df196b64';  // Replace with your Appwrite collection ID

  const submitLanguage = () => {
    isLoading = true;  // Set loading state

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;

          // Set the chosen language in the store
          selectedLanguage.set(language);

          try {
            // Load monuments
            await loadMonuments();

            // Find the closest monument
            findClosestMonument();

            if (closestMonument) {
              // Redirect to Play page with the closest monument ID
              goto(`/play?id=${closestMonument.id}&lang=${language}`);
            } else {
              locationError = 'No nearby monuments found.';
              isLoading = false;
            }
          } catch (error) {
            locationError = 'Error retrieving monuments.';
            console.error(error.message);
            isLoading = false;
          }
        },
        (error) => {
          locationError = 'Could not retrieve your location';
          console.error(error.message);
          isLoading = false;  // Stop loading on error
        }
      );
    } else {
      locationError = 'Geolocation is not supported by your browser.';
      isLoading = false;  // Stop loading if geolocation isn't supported
    }
  };

  // Load monuments from the Appwrite database
  const loadMonuments = async () => {
    const response = await databases.listDocuments(databaseId, collectionId);
    monuments = await Promise.all(response.documents.map(async (doc) => {
      let photoUrl = null;

      if (doc.photoFileId) {
        // Get the file preview URL from Appwrite storage
        photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
      }

      return {
        id: doc.$id,
        name: doc.Route_name,
        lat: parseFloat(doc.lat),
        lng: parseFloat(doc.lng),
        photoUrl  // Include the photoUrl
      };
    }));
  };

  // Calculate the distance between two coordinates using the Haversine formula
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // Find the closest monument to the user's location
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
</script>

<div class="flex items-start justify-center h-full bg-opacity-50 pt-40">
  <div class="max-w-xl mx-auto p-8">
    <h1 class="text-2xl font-bold mb-4">Which language are you learning?</h1>

    <div class="mb-4">
      <label for="language" class="font-bold">Select Language:</label>
      <select id="language" bind:value={language} class="p-2 border rounded w-full">
        <option value="english">English</option>
        <option value="spanish">Spanish</option>
        <option value="italian">Italian</option>
        <option value="japanese">Japanese</option>
        <option value="danish">Danish</option>
      </select>
    </div>

    {#if locationError}
      <p class="text-red-500">{locationError}</p>
    {/if}

    <style>
      .custom-spinner {
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        width: 1rem;
        height: 1rem;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>

    <button on:click={submitLanguage} class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded w-full" disabled={isLoading}>
      {#if isLoading}
        <div class="custom-spinner mr-2"></div>
        Loading...
      {:else}
        Continue
      {/if}
    </button>
  </div>
</div>
