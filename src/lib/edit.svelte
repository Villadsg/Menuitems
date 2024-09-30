<script lang="ts">
    import { databases } from '$lib/appwrite'; // Import Appwrite
    import { onMount } from 'svelte';
  
    export let monumentToEdit; // Data of the monument to edit
    export let isEditing = false; // Control editing mode
    export let onClose; // A function to close the edit form
  
    let editMonumentData = {
      id: '',
      Route_name: '',
      lat: '',
      lng: ''
    };
    let message = '';
  
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66eefaaf001c2777deb9';
  
    // Populate editMonumentData with the selected monument details when editing starts
    onMount(() => {
      if (monumentToEdit) {
        editMonumentData = {
          id: monumentToEdit.$id,
          Route_name: monumentToEdit.Route_name,
          lat: monumentToEdit.lat,
          lng: monumentToEdit.lng
        };
      }
    });
  
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
        message = 'Monument updated successfully!';
        onClose(); // Close the edit form once the update is successful
      } catch (error) {
        console.error('Error updating monument:', error);
        message = 'Failed to update monument.';
      }
    };
  
    // Cancel editing
    const cancelEdit = () => {
      onClose(); // Call onClose to cancel and close the edit form
    };
  </script>
  
  {#if isEditing}
    <div class="edit-form max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 class="text-xl font-bold mb-4">Edit Monument</h2>
      <form on:submit|preventDefault={updateMonument} class="space-y-4">
        <p class="text-red-500">{message}</p>
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
  