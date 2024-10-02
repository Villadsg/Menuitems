<script lang="ts">
  import { account, databases } from '$lib/appwrite';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';

   // Make userId reactive
   $: userId = $user?.$id;

  let username = '';

  let usernamechange = ''; // This will now be changeable via the UI

  // Profile info database collection
  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66fbb317002371bfdffc';


  // Fetch user details from the Appwrite account
  onMount(async () => {
      try {
          const userInfo = await account.get();
          username = userInfo.name || 'Guest';


          // Fetch existing user document, if it exists, and pre-fill the fields
          try {
              const userDocument = await databases.getDocument(
                  databaseId,
                  collectionId,
                  userId
              );
              if (userDocument) {
                  
                  usernamechange = userDocument.userNameChangable || username;
              }
          } catch (error) {
              console.log('No existing document, filling form with default values.');
          }
      } catch (error) {
          console.error('Failed to fetch user data:', error);
      }
  });

  // Function to navigate to the edit tours page
  function navigateToEditTours() {
      goto('/edit-tours');
  }

  function navigateToEditProfile() {
      goto('/edit-profile');
  }


</script>

<!-- HTML Template -->
<div class="flex justify-center items-center min-h-screen">
  <div class="text-center">
      <h2 class="text-xl font-semibold">Hello, {usernamechange}!</h2>

      <button 
      class="btn btn-primary mt-4" 
      on:click={navigateToEditProfile}>
      Edit your profile
  </button>

      <button 
          class="btn btn-primary mt-4" 
          on:click={navigateToEditTours}>
          See or Edit your created Tours
      </button>
  </div>
</div>
