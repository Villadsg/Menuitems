<script lang="ts">
    import { onMount } from 'svelte';
    import { databases } from '$lib/appwrite';
    import { user } from '$lib/userStore';
  
    // Database and collection identifiers
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66eefaaf001c2777deb9'; // English collection or adjust for translated ones
  
    let completedRoutes = [];
    let loading = true;
    let errorMessage = '';
  
    $: userId = $user?.$id;
  
    // Fetch the completed routes based on the user's answered quizzes
    const fetchCompletedRoutes = async () => {
      if (!userId) return;
  
      try {
        const response = await databases.listDocuments(databaseId, collectionId, [
          Query.equal('userId', userId), // Fetch routes for the current user
          Query.equal('completed', true), // Filter where the user has completed the final quiz question
        ]);
  
        completedRoutes = response.documents.map((doc) => ({
          routeName: doc.Route_name,
          dateCompleted: doc.dateModified.slice(0, 16).replace('T', ' '),
        }));
      } catch (error) {
        errorMessage = 'Failed to load completed routes.';
      } finally {
        loading = false;
      }
    };
  
    // Load the data when the component mounts
    onMount(fetchCompletedRoutes);
  </script>
  
  {#if loading}
    <div class="loading loading-spinner loading-lg"></div>
  {:else if errorMessage}
    <p class="text-red-500">{errorMessage}</p>
  {:else if completedRoutes.length > 0}
    <div class="completed-routes-list">
      <h2 class="text-lg font-semibold mb-4">Completed Routes:</h2>
      <ul class="list-disc pl-5">
        {#each completedRoutes as route}
          <li>
            <span class="font-bold">{route.routeName}</span> - Completed on: {route.dateCompleted}
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <p>No completed routes yet.</p>
  {/if}
  