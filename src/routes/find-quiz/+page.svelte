

<script lang="ts">
  import { getCurrentLocation, calculateDistance } from '$lib/location'; // Import location utilities
  import { account, databases, storage } from '$lib/appwrite'; // Import the initialized Appwrite client
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';
  // Import the goto function from SvelteKit
  import DistanceCheck from '$lib/distanceCheck.svelte'; 
  let showDistanceCheck = false; 
  let selectedMonument = null; 
let showTooFarMessage = false;
  // State variables
  let status = '';
  let page = 'home';
  const databaseId = '6609473fbde756e5dc45';  
  const collectionId = '66eefaaf001c2777deb9';  
const userCollectionId = '66fbb317002371bfdffc'; 
  const bucketId = '66efdb420000df196b64';
  let language = 'EN'; 
  let latitude: number | null = null;
  let longitude: number | null = null;
  let monuments = [];
  let sortedMonuments = [];



const loadMonuments = async () => {
  const response = await databases.listDocuments(databaseId, collectionId);

  monuments = await Promise.all(
    response.documents.map(async (doc) => {
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

      // Parse the Description JSON and extract the English ('EN') description
      let englishDescription = "No description available";
      try {
        const descriptionJson = JSON.parse(doc.Description);
        englishDescription = descriptionJson['EN'] || "No description available";
      } catch (error) {
        console.error("Error parsing Description JSON:", error);
      }

      return {
        id: doc.$id,
        name: doc.Route_name,
        description: englishDescription, // Use the English description
        lat: parseFloat(doc.lat),
        lng: parseFloat(doc.lng),
        photoUrl,
        dateModified: doc.dateModified.slice(0, 16).replace('T', ' '),
        creator,
      };
    })
  );
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
    if (monument.distance > 1000) {
      showTooFarMessage = true; // Show the "too far" message
    } else if (monument.distance > 1) {
      selectedMonument = monument; // Store the selected monument
      showDistanceCheck = true; // Show the DistanceCheck component if the distance is greater than 1 km
    } else {
      // Navigate to the closest monument's quiz page
      goto(`/play?id=${monument.id}`);
    }
  };

  onMount(async () => {
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

const closeTooFarMessage = () => {
    showTooFarMessage = false;
};

</script>

<div class="space-y-4 pt-20">
  {#if showDistanceCheck}
    <DistanceCheck
      distance={selectedMonument.distance}
      onContinue={continueNavigation}
      onCancel={cancelNavigation}
    />
  {/if}

  {#if showTooFarMessage}
    <DistanceCheck
      monumentTooFar={true}
      onCloseTooFar={closeTooFarMessage}
    />
  {/if}

  <!-- Only show monument content if on a relevant page -->
  {#if page === 'results'}
    <!-- Main content container -->
    <div class="max-w-4xl mx-auto p-6 bg-base-100 rounded-lg shadow-lg mt-10 sm:max-w-full md:max-w-3xl lg:max-w-4xl"> 
     
      {#if sortedMonuments.length > 0}
        <h1 class="text-2xl font-bold mb-6 text-center">List of places Nearby</h1>
        {#each sortedMonuments as monument}
          <div class="mb-6 p-5 bg-base-200 rounded-lg shadow">
            <h3 class="text-xl font-semibold text-base-content mb-2">{monument.name}</h3>
            <p class="text-gray-500 mb-3">{monument.description}</p> <!-- Display Description -->

            {#if monument.photoUrl}
              <img
                src="{monument.photoUrl}"
                alt="{monument.name}"
                class="my-3 rounded shadow w-full"
              />
            {/if}

            <p class="text-gray-500">
              Distance to location: <span class="font-semibold">{monument.distance.toFixed(2)} km</span>
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
              Open
            </button>
          </div>
        {/each}
      {:else}
        <p class="text-center text-gray-500">No menu content found</p>
      {/if}
       <h1 class="text-2xl font-bold mb-6 text-center">Map of places</h1>
      <Map monuments={monuments} />

      <button
        class="btn btn-outline w-full mt-6"
        on:click={navigateTohome}
      >
        Back to Home
      </button>
    </div>
  {:else}
    <div class="flex items-center justify-center min-h-screen">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {/if}
</div>