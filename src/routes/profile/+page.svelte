<script lang="ts">
    import { account, databases } from '$lib/appwrite';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';
    import CompletedRoutes from '$lib/completedtours.svelte'; // Adjust path if necessary
  
    $: userId = $user?.$id;
  
    let username = '';
    let usernamechange = ''; // This will now be changeable via the UI
  
    // Profile info database collection
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66fbb317002371bfdffc';
  
    onMount(async () => {
        try {
            const userInfo = await account.get();
            username = userInfo.name || 'Guest';
  
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
  
    function navigateToEditTours() {
        goto('/edit-tours');
    }
  
    function navigateToEditProfile() {
        goto('/edit-profile');
    }
  </script>
  
  <!-- HTML Template -->
  <div class="flex justify-center items-center min-h-screen p-8">
    <div class="flex flex-col md:flex-row bg-gray-100 shadow-lg rounded-lg overflow-hidden max-w-4xl w-full">
        <!-- Profile Section -->
        <div class="p-6 md:w-1/3 bg-white border-r flex flex-col items-center">
            <h2 class="text-2xl font-semibold mb-2">Hello, {usernamechange}!</h2>
            <p class="text-gray-600 mb-4">Welcome to your profile page.</p>
  
            <button 
                class="btn btn-primary mt-2 w-full" 
                on:click={navigateToEditProfile}>
                Edit your profile
            </button>
  
            <button 
                class="btn btn-primary mt-2 w-full" 
                on:click={navigateToEditTours}>
                See or Edit your created Tours
            </button>
        </div>
  
    <!-- Profile Page -->
<div class="p-6 flex-grow">
    <CompletedRoutes {userId} />
</div>

    </div>
  </div>
  