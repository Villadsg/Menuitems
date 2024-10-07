<script lang="ts">
  import { account, databases, storage } from '$lib/appwrite'; // Import the initialized Appwrite client
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation'; // Import the goto function from SvelteKit
  import { Query } from 'appwrite';
  
  // MonumentFinder logic
  let status = '';
  let page = 'home';
  const databaseId = '6609473fbde756e5dc45';  // Use your actual database ID
  const collectionIdEnglish = '66eefaaf001c2777deb9';  // Use your actual collection ID
  const translatedCollectionId = '66fe6ac90010d9e9602f';
  const bucketId = '66efdb420000df196b64';
  const userCollectionId = '66fbb317002371bfdffc';  // Use your actual user collection ID
  let language = 'english';
  let monuments = [];
  let sortedMonuments = [];

  // User-related code
  let userStatus = writable<Promise<null | object>>(null);

    const checkUser = async () => {
  try {
    const currentUser = await account.get();
    if (currentUser && currentUser.$id) {
      // Fetch the user's langLearn attribute
      try {
        const userDoc = await databases.getDocument(databaseId, userCollectionId, currentUser.$id);
        
        language = userDoc.langLearn || 'english';
        console.log(language) // Set language to the user's selected langLearn or default to English
      } catch (error) {
        console.error("Error fetching user document:", error);
      }
      return currentUser;
    }
    return null; // No user logged in
  } catch (error) {
    return null; // Return null if no user is logged in
  }
};

 


  const loadMonuments = async () => {
    try {
      const currentCollectionId = language === 'english' ? collectionIdEnglish : translatedCollectionId;
    
    // Load documents from the selected collection
    const response = await databases.listDocuments(databaseId, currentCollectionId,
     language === 'english' ? [] : [Query.equal("language", language)]
    );


      monuments = await Promise.all(response.documents.map(async (doc) => {
        let photoUrl = null;
        let creator = 'unknown';

        if (doc.photoFileId) {
          // Get the file preview URL from Appwrite storage
          photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
        }

         // Fetch the creator's name
      if (doc.userId) {
        try {
          const userDoc = await databases.getDocument(databaseId, userCollectionId, doc.userId);
          creator = userDoc.userNameChangable || 'Unknown';
        } catch (error) {
          console.error("Error fetching user document:", error);
        }
      }

        return {
          id: doc.$id, // Include the document ID
          name: doc.Route_name,
          lat: doc.lat,
          lng: doc.lng,
          photoUrl,  // Include the photoUrl
          dateModified: doc.dateModified.slice(0, 16).replace('T', ' '), 
          creator
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

  // Automatically find the user's location and sort nearby monuments
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
    goto(`/play?id=${monument.id}&lang=${language}`);
  };

 
// On mount, fetch user info, load monuments, and find location
onMount(async () => {
    const user = await checkUser();  // First check the user and set language
    userStatus.set(Promise.resolve(user));
    await loadMonuments();  // Then load monuments based on the language
    findLocation();  // Finally, find the user's location
  });

  function navigateTohome() {
    goto('/');
  }

</script>

<!-- User status and monument display -->
{#await $userStatus}
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-md"></span>
  </div>
{:then user}
  {#if user}
    <!-- Show MonumentFinder content when logged in -->
    {#if page !== 'results'}
      <div class="flex items-center justify-center h-screen">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {/if}

    <!-- Results Page -->
    {#if page === 'results'}
      <div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8 pt-20">
        <h1>List of challenges nearby</h1>
        {#if sortedMonuments.length > 0}
          {#each sortedMonuments as monument}
            <div class="mb-4 p-4 bg-gray-100 rounded shadow">
              <h3 class="text-xl font-semibold text-gray-800">{monument.name}</h3>
              {#if monument.photoUrl}
                <img src="{monument.photoUrl}" alt="{monument.name}" class="my-2 max-w-xs rounded shadow" />
              {/if}
              <p class="text-gray-500">Distance: {monument.distance.toFixed(2)} km</p>
              <p class="text-gray-500">Date Modified: {monument.dateModified}</p>
              <p class="text-gray-500">Creator: {monument.creator}</p>
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
          on:click={navigateTohome}
        >
          Back to Home
        </button>
      </div>
    {/if}
  {:else}
    <div class="pt-20">
      <p>Couldn't find any</p>
    </div>
  {/if}
{:catch error}
  <div>Error loading user status: {error.message}</div>
{/await}
