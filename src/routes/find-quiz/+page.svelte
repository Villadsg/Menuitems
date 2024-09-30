<script lang="ts">
    import { account } from '$lib/appwrite';
    import MonumentFinder from '$lib/MonumentFinder.svelte';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    // Writable store to manage the user state
    let userStatus = writable<Promise<null | object>>(null);
  
    // Function to check user login status
    const checkUser = async () => {
      try {
        const currentUser = await account.get();
        return currentUser; // Return user object if logged in
      } catch (error) {
        return null; // Return null if no user is logged in
      }
    };
  
    // Run checkUser when the component is mounted and store the promise
    onMount(() => {
      userStatus.set(checkUser());
    });
  
  
  </script>
  
  <!-- Home page content -->
  {#await $userStatus}
<div class="flex items-center justify-center h-screen">
<span class="loading loading-spinner loading-md"></span>
</div>
  {:then user}
    {#if user}
      <!-- Show MonumentFinder component when logged in -->
      <div class="pt-20">
        <MonumentFinder />
      </div>
    {:else}

    <div class="pt-20">
      <p>Couldn't find any</p>
    </div>

    {/if}


 {:catch error}
    <div>Error loading user status: {error.message}</div>
{/await}
      