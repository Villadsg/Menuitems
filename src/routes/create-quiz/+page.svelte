<script lang="ts">
    import { databases } from '$lib/appwrite';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore'; 
    import { get } from 'svelte/store'; // Import get function to access user data
  
    let routeName = '';
    let lat = '';
    let lng = '';
    let message = '';
  
    const databaseId = '6609473fbde756e5dc45'; 
    const collectionId = '66eefaaf001c2777deb9';
  
    // Function to submit the monument data
    const submitMonument = async () => {
      try {
        const userId = get(user)?.$id; // Safely access the logged-in user's ID
        const documentData = {
          Route_name: routeName,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          userId: userId  // Include the userId in the document
        };
  
        // Create a new document in Appwrite
        await databases.createDocument(databaseId, collectionId, 'unique()', documentData);
  
        message = 'Monument created successfully!';
        goto('/');  // Redirect after creation
      } catch (error) {
        console.error('Error creating monument:', error.message);
        message = `Failed to create monument. Error: ${error.message}`;
      }
    };
  </script>
  
  <!-- Your form stays the same -->
  
  
  <h1 class="text-2xl font-bold mb-6">Create a New Monument</h1>
  
  <form on:submit|preventDefault={submitMonument} class="space-y-4">
    <div>
      <label class="block text-gray-700">Monument Name (Route Name)</label>
      <input type="text" bind:value={routeName} placeholder="Enter Monument Name" class="w-full border p-2 rounded" required />
    </div>
  
    <div>
      <label class="block text-gray-700">Latitude</label>
      <input type="float" step="any" bind:value={lat} placeholder="Enter Latitude" class="w-full border p-2 rounded" required />
    </div>
  
    <div>
      <label class="block text-gray-700">Longitude</label>
      <input type="float" step="any" bind:value={lng} placeholder="Enter Longitude" class="w-full border p-2 rounded" required />
    </div>
  
    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Create Monument</button>
  </form>
  
  <p class="text-green-500 mt-4">{message}</p>
  