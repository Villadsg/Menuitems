<script lang="ts">
  import { getCurrentLocation, calculateDistance } from '$lib/location'; // Import location utilities
  import { account, databases, storage } from '$lib/appwrite'; // Import the initialized Appwrite client
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation'; // Import the goto function from SvelteKit
  import { Query } from 'appwrite';
  import DistanceCheck from '$lib/distanceCheck.svelte'; 
  let showDistanceCheck = false; 
  let selectedMonument = null; 

  // State variables
  let status = '';
  let page = 'home';
  const databaseId = '6609473fbde756e5dc45';  
  const collectionId = '66eefaaf001c2777deb9';  

  const bucketId = '66efdb420000df196b64';
  const userCollectionId = '66fbb317002371bfdffc'; 
  let language = 'english'; 
  let latitude: number | null = null;
  let longitude: number | null = null;
  let monuments = [];
  let sortedMonuments = [];

  // User-related code
  let userStatus = writable<Promise<null | object>>(null);

  const checkUser = async () => {
    try {
      const currentUser = await account.get();
      if (currentUser && currentUser.$id) {
        // Fetch the user's langLearn attribute
        const userDoc = await databases.getDocument(databaseId, userCollectionId, currentUser.$id);
        language = userDoc.langLearn || 'english'; // Set language based on user's selection
        return currentUser;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const loadMonuments = async () => {
    const response = await databases.listDocuments(databaseId, collectionId,
    [Query.equal('language', language)]
    );

    monuments = await Promise.all(response.documents.map(async (doc) => {
      let photoUrl = null;
      let creator = 'unknown';

      if (doc.photoFileId) {
        photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
      }

      if (doc.userId) {
        try {
          const userDoc = await databases.getDocument(databaseId, userCollectionId, doc.userId);
          creator = userDoc.userNameChangable || 'Unknown';
        } catch (error) {
          console.error("Error fetching user document:", error);
        }
      }

      return {
        id: doc.$id,
        name: doc.Route_name,
        lat: parseFloat(doc.lat),
        lng: parseFloat(doc.lng),
        photoUrl,
        dateModified: doc.dateModified.slice(0, 16).replace('T', ' '), 
        creator
      };
    }));
  };

  const findLocation = async () => {
    try {
      const location = await getCurrentLocation(); // Get user's location
      latitude = location.latitude;
      longitude = location.longitude;
      status = `Latitude: ${latitude}, Longitude: ${longitude}`;

      sortedMonuments = monuments
        .map(monument => {
          const distance = calculateDistance(latitude, longitude, monument.lat, monument.lng);
          return { ...monument, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      page = 'results';
    } catch (error) {
      status = error.message;
    }
  };

  const selectMonument = (monument) => {
    if (monument.distance > 1) {
      selectedMonument = monument; // Store the selected monument
      showDistanceCheck = true; // Show the DistanceCheck component if the distance is greater than 1 km
    } else {
      // Navigate to the closest monument's quiz page
      goto(`/play?id=${monument.id}`);
    }
  };

  onMount(async () => {
    const user = await checkUser();
    userStatus.set(Promise.resolve(user));
    await loadMonuments();
    await findLocation();
  });

  function navigateTohome() {
    goto('/');
  }

  const continueNavigation = () => {
    showDistanceCheck = false; // Hide the DistanceCheck component
    goto(`/play?id=${selectedMonument.id}`); // Continue to the monument's quiz page
  };

  const cancelNavigation = () => {
    showDistanceCheck = false; // Hide the DistanceCheck component and stay on the current page
  };

</script>
<div class="space-y-4 max-w-md mx-auto pt-20">
  {#if showDistanceCheck}
    <DistanceCheck
      distance={selectedMonument.distance}
      onContinue={continueNavigation}
      onCancel={cancelNavigation}
    />
  {/if}

  {#await $userStatus}
    <!-- Loading state while fetching user status -->
    <div class="flex items-center justify-center min-h-screen">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:then user}
    {#if user}
      <!-- Only show monument content if on a relevant page -->
      {#if page !== 'results'}
        <div class="flex items-center justify-center min-h-screen">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {/if}

      <!-- Main content container -->
      <div class="max-w-4xl mx-auto p-6 bg-base-100 rounded-lg shadow-lg mt-10">
        
        {#if sortedMonuments.length > 0}
          <h1 class="text-2xl font-bold mb-6 text-center">List of Challenges Nearby</h1>
          {#each sortedMonuments as monument}
            <div class="mb-6 p-5 bg-base-200 rounded-lg shadow">
              <h3 class="text-xl font-semibold text-base-content mb-2">{monument.name}</h3>
              
              {#if monument.photoUrl}
                <img
                  src="{monument.photoUrl}"
                  alt="{monument.name}"
                  class="my-3 max-w-xs rounded shadow mx-auto"
                />
              {/if}
              
              <p class="text-gray-500">
                Distance to starting point: <span class="font-semibold">{monument.distance.toFixed(2)} km</span>
              </p>
              <p class="text-gray-500">
                Date Modified: <span class="font-semibold">{monument.dateModified}</span>
              </p>
              <p class="text-gray-500">
                Creator: <span class="font-semibold">{monument.creator}</span>
              </p>
              
              <button
                class="btn btn-success w-full mt-3"
                on:click={() => selectMonument(monument)}
              >
                Select
              </button>
            </div>
          {/each}
        {:else}
          <p class="text-center text-gray-500">No monuments found.</p>
        {/if}
        
        <button
          class="btn btn-outline w-full mt-6"
          on:click={navigateTohome}
        >
          Back to Home
        </button>
      </div>
    {/if}
    
  {:catch error}
    <div class="flex items-center justify-center min-h-screen text-error">
      Error loading user status: {error.message}
    </div>
  {/await}
</div>