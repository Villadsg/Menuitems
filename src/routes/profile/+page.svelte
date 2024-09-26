<script lang="ts">
    import { databases } from '$lib/appwrite';
    import { user } from '$lib/userStore';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { Query } from 'appwrite';
  
    let monuments = [];
    let message = '';
  
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66eefaaf001c2777deb9';
    const userId = get(user)?.$id;
  
    // Variables for editing
    let isEditing = false;
    let editMonumentData = {
      id: '',
      Route_name: '',
      lat: '',
      lng: ''
    };
  
    // Load monuments
    const loadMonuments = async () => {
      try {
        const response = await databases.listDocuments(
          databaseId,
          collectionId,
          [Query.equal('userId', userId)]
        );
        monuments = response.documents;
        if (monuments.length === 0) {
          message = 'No monument tours created yet.';
        } else {
          message = '';
        }
      } catch (error) {
        console.error('Error loading monuments:', error);
        message = 'Failed to load monuments.';
      }
    };
  
    // Delete monument
    const deleteMonument = async (id) => {
      try {
        await databases.deleteDocument(databaseId, collectionId, id);
        await loadMonuments();
      } catch (error) {
        console.error('Error deleting monument:', error);
      }
    };
  
    // Start editing
    const editMonument = (monument) => {
      isEditing = true;
      editMonumentData.id = monument.$id;
      editMonumentData.Route_name = monument.Route_name;
      editMonumentData.lat = monument.lat;
      editMonumentData.lng = monument.lng;
    };
  
    // Update monument
    const updateMonument = async () => {
      try {
        const updatedData = {
          Route_name: editMonumentData.Route_name,
          lat: parseFloat(editMonumentData.lat),
          lng: parseFloat(editMonumentData.lng)
        };
        await databases.updateDocument(
          databaseId,
          collectionId,
          editMonumentData.id,
          updatedData
        );
        isEditing = false;
        editMonumentData = { id: '', Route_name: '', lat: '', lng: '' };
        await loadMonuments();
      } catch (error) {
        console.error('Error updating monument:', error);
        message = 'Failed to update monument.';
      }
    };
  
    // Cancel editing
    const cancelEdit = () => {
      isEditing = false;
      editMonumentData = { id: '', Route_name: '', lat: '', lng: '' };
    };
  
    onMount(async () => {
      await loadMonuments();
    });
  </script>
  
<div class="pt-20 max-w-md mx-auto">
  <h1 class="text-2xl font-bold mb-4 space-y-4 max-w-md mx-auto">My Tours</h1>
  <p class="text-red-500">{message}</p>
  
  {#if isEditing}
    <div class="edit-form max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 class="text-xl font-bold mb-4">Edit Monument</h2>
      <form on:submit|preventDefault={updateMonument} class="space-y-4">
        <div>
          <label class="block text-gray-700">Monument Name (Route Name)</label>
          <input
            type="text"
            bind:value={editMonumentData.Route_name}
            class="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label class="block text-gray-700">Latitude</label>
          <input
            type="number"
            step="any"
            bind:value={editMonumentData.lat}
            class="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label class="block text-gray-700">Longitude</label>
          <input
            type="number"
            step="any"
            bind:value={editMonumentData.lng}
            class="w-full border p-2 rounded"
            required
          />
        </div>
        <div class="flex space-x-2">
          <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded">
            Update Monument
          </button>
          <button
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded"
            on:click={cancelEdit}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  <ul>
  
    {#each monuments as monument (monument.$id)}
      <li class="mb-4 p-4 bg-gray-100 rounded shadow">
        <h3 class="text-xl font-semibold">{monument.Route_name}</h3>
        <p>Latitude: {monument.lat}</p>
        <p>Longitude: {monument.lng}</p>
        <button
          class="bg-red-500 text-white px-4 py-2 rounded"
          on:click={() => deleteMonument(monument.$id)}
        >
          Delete
        </button>
        <button
          class="bg-blue-500 text-white px-4 py-2 rounded ml-2"
          on:click={() => editMonument(monument)}
        >
          Edit
        </button>
      </li>
    {/each}
  </ul>
</div>