<script lang="ts">
    import { databases } from '$lib/appwrite';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';
    import { get } from 'svelte/store';
    import { Label, Button } from 'flowbite-svelte';
  
    let routeName = '';
    let lat = '';
    let lng = '';
    let message = '';
  
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66eefaaf001c2777deb9';
  
    const submitMonument = async () => {
      try {
        const userId = get(user)?.$id;
        const documentData = {
          Route_name: routeName,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          userId: userId
        };
        await databases.createDocument(databaseId, collectionId, 'unique()', documentData);
        message = 'Monument created successfully!';
        goto('/');
      } catch (error) {
        message = `Failed to create monument. Error: ${error.message}`;
      }
    };
  </script>
  
  <h1 class="text-2xl font-bold mb-4">Create Monument</h1>
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
    <Button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg">Create Monument</Button>
    {#if message}
      <p class="text-green-500 mt-4">{message}</p>
    {/if}
  </form>
  