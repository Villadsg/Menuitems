<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';

  export let userId: string; // Pass the userId as a prop
  const databaseId = '6609473fbde756e5dc45';
  const userCollectionId = '66fbb317002371bfdffc';

  let locationsDone = [];

  onMount(async () => {
    try {
      // Fetch the user document to get the locationsDone array
      const userDoc = await databases.getDocument(databaseId, userCollectionId, userId);
      
      locationsDone = userDoc.locationsDone
        .map((item) => JSON.parse(item)) // Parse JSON strings back into objects
        .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()); // Sort by date in descending order
    } catch (error) {
      console.error('Error loading completed routes:', error);
    }
  });

  function navigateToPlay(id: string) {
    goto(`/play?id=${id}`);
  }

  async function deleteRoute(routeId: string) {
    // Remove only the specific route with matching ID
    const updatedLocationsDone = locationsDone.filter((location) => location.id !== routeId);
    
    try {
      // Update the user document with the modified locationsDone array
      await databases.updateDocument(databaseId, userCollectionId, userId, {
        locationsDone: updatedLocationsDone.map((item) => JSON.stringify(item)), // Convert back to JSON strings for storage
      });
      
      // Update local state only if the database update is successful
      locationsDone = updatedLocationsDone;
    } catch (error) {
      console.error('Error deleting route:', error);
    }
  }
</script>
<div class="completed-routes p-4 bg-base-200 rounded-lg shadow-lg">
  <h2 class="text-2xl font-bold mb-4 text-center">Completed Routes</h2>

  {#if locationsDone.length > 0}
    <ul class="space-y-4">
      {#each locationsDone as location}
        <li class="p-4 bg-base-100 rounded-lg shadow-md flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <p class="text-lg font-semibold">Location: <span class="text-primary">{location.Route_name}</span></p>
            <p class="text-sm text-gray-500">Date of visit: {location.Date}</p>
          </div>
          <div class="mt-3 md:mt-0 flex space-x-2">
            <button 
              class="btn btn-primary"
              on:click={() => navigateToPlay(location.id)}
            >
              Play
            </button>
            <button 
              class="btn btn-error"
              on:click={() => deleteRoute(location.id)}
            >
              Delete
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-center text-gray-500">No routes completed yet.</p>
  {/if}
</div>
