<script lang="ts">
  import { databases, account } from '$lib/appwrite';
  import { user } from '$lib/userStore';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Query } from 'appwrite';
  import { goto } from '$app/navigation';

  let monuments = [];
  let message = '';
  let username = '';

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  const userId = get(user)?.$id;

  let editMonumentData = {
    id: '',
    Route_name: '',
    lat: '',
    lng: ''
  };

  // Function to navigate to the edit tours page
  function navigateToEditTours() {
      goto('/edit-tours');
  }

  // Fetch user details from the Appwrite account
  onMount(async () => {
      try {
          const userInfo = await account.get();
          username = userInfo.name || 'Guest';  // Assuming name is the username
      } catch (error) {
          console.error('Failed to fetch user data:', error);
      }
  });

</script>

<div class="flex justify-center items-center min-h-screen">
  <div class="text-center">
      <h2 class="text-xl font-semibold">Hello, {username}!</h2>
      <button 
          class="btn btn-primary mt-4" 
          on:click={navigateToEditTours}>
          List of own created tours
      </button>
  </div>
</div>
