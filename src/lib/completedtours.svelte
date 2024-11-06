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
</script>

<div class="completed-routes">
  <h2 class="text-2xl font-bold mb-4">Completed Routes</h2>

  {#if locationsDone.length > 0}
    <ul>
      {#each locationsDone as location}
        <li class="mb-2 flex items-center">
          <span class="mr-4">{location.Route_name}</span>
          <button 
             class="btn btn-success mt-3"
            on:click={() => navigateToPlay(location.id)}
          >
            Play
          </button>
          <span>{location.Date}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p>No routes completed yet.</p>
  {/if}
</div>

<style>
  .completed-routes {
    max-width: 600px;
    margin: auto;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 8px;
  }
</style>
