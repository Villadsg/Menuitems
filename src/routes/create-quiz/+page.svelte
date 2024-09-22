<script lang="ts">
    import { onMount } from 'svelte'; 
    import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; // Import storage
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';
    import { get } from 'svelte/store';
    import { Label, Button } from 'flowbite-svelte';
    
    let routeName = '';
    let lat = '';
    let lng = '';
    let message = '';
    let loading = false;
    let files = null;  // New files variable for file input
    let bucketId = '66efdb420000df196b64'; // Your Appwrite bucket ID
    
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66eefaaf001c2777deb9';
    
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        loading = true;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            lat = position.coords.latitude.toString();
            lng = position.coords.longitude.toString();
            loading = false;
          },
          (error) => {
            console.error('Error getting location:', error.message);
            message = 'Could not retrieve your location.';
            loading = false;
          }
        );
      } else {
        message = 'Geolocation is not supported by your browser.';
      }
    };
    
    const submitMonument = async () => {
  try {
    const userId = get(user)?.$id;
    
    let fileId = null;

    // Check if a file is selected
    if (files && files.length > 0) {
      const file = files[0];

      // Upload the file to Appwrite Storage
      const response = await storage.createFile(
        bucketId,
        ID.unique(),
        file,
        [
          Permission.read(Role.any()), // Public read access
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );
      fileId = response.$id;
    }

    // Create the monument document (include photoFileId only if a file was uploaded)
    const documentData = {
      Route_name: routeName,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      userId: userId,
      ...(fileId && { photoFileId: fileId }) // Add photoFileId only if fileId exists
    };
    
    await databases.createDocument(databaseId, collectionId, ID.unique(), documentData);
    message = 'Monument created successfully!';
    goto('/');
  } catch (error) {
    message = `Failed to create monument. Error: ${error.message}`;
  }
};

  </script>
  
  <h1 class="text-2xl font-bold mb-4">Create Tour</h1>
  <form on:submit|preventDefault={submitMonument} class="space-y-4 max-w-md mx-auto">
    <div>
      <Label for="routeName">Monument Name (Route Name)</Label>
      <input id="routeName" type="text" bind:value={routeName} placeholder="Enter Monument Name" required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
    <div>
      <Label for="lat">Latitude</Label>
      <input id="lat" type="number" step="any" bind:value={lat} placeholder="Enter Latitude" required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
    <div>
      <Label for="lng">Longitude</Label>
      <input id="lng" type="number" step="any" bind:value={lng} placeholder="Enter Longitude" required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
  
    <!-- New file input for photo -->
    <div>
      <Label for="photo">Upload Photo</Label>
      <input id="photo" type="file" bind:this={files} accept="image/*" class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
  
    <!-- Button to fill coordinates with current location -->
    <Button type="button" class="w-full bg-gray-500 text-white px-4 py-2 rounded-lg" on:click={getCurrentLocation} disabled={loading}>
      {#if loading}
        <svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      {:else}
        Use Current Location
      {/if}
    </Button>
  
    <Button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg">Create Monument</Button>
  
    {#if message}
      <p class="text-green-500 mt-4">{message}</p>
    {/if}
  </form>
  