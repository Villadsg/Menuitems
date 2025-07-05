<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { user } from '$lib/userStore';
  import { onMount } from 'svelte';
  import { compressImage } from '$lib/compress'; // Import the compress function
  import { fly, fade } from 'svelte/transition';
  import Card from '$lib/components/Card.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { goto } from '$app/navigation';

  let deleteLoading = false; // New variable for delete loading spinner
  let loading = false;
  let menus = [];
  let message = '';
  let menuToDelete = null;
  let confirmationName = '';
  let errorMessage = '';

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  
  $: userId = $user?.$id;

  let isEditing = false;
  let editMenuData = {
    id: '',
    Route_name: '',
    lat: '',
    lng: '',
    photoFileId: '',
    Description: ''
  };

  let newPhotoFile = null;

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      try {
        newPhotoFile = await compressImage(file); // Compress the file
      } catch (error) {
        console.error('Image compression failed:', error);
      }
    }
  }

  /** Function to translate text */
  async function translateText(text: string, targetLang: string) {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      return data.translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text if translation fails
    }
  }

  const loadMenus = async () => {
    if (!userId) {
      console.error('User ID is not available yet.');
      return; // Prevent querying if userId is not set
    }

    try {
      loading = true;
      const response = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal('userId', userId)]
      );
      menus = response.documents;
      message = menus.length === 0 ? 'No menus uploaded yet.' : '';
    } catch (error) {
      console.error('Error loading menus:', error);
      message = 'Failed to load menus.';
    } finally {
      loading = false;
    }
  };

  const confirmDelete = async (menu) => {
    if (menu && confirmationName === menu.Route_name) {
      deleteLoading = true;
      try {
        if (menu.photoFileId) {
          await storage.deleteFile('66efdb420000df196b64', menu.photoFileId);
        }

        await databases.deleteDocument(databaseId, collectionId, menu.$id);
        await loadMenus();

        // Close the modal after successful deletion
        menuToDelete = null;
        confirmationName = '';  // Reset the confirmation name input
        errorMessage = ''; 
        
      } catch (error) {
        console.error('Error deleting menu:', error);
      } finally {
        deleteLoading = false; // Reset delete loading after the delete operation completes
      }
    } else {
      errorMessage = "The name you entered doesn't match the menu.";
    }
  };

  const initiateDelete = (menu) => {
    menuToDelete = menu;
    confirmationName = '';
    errorMessage = '';
  };

  const editMenu = (menu) => {
    isEditing = true;
    editMenuData = {
      id: menu.$id,
      Route_name: menu.Route_name,
      lat: menu.lat,
      lng: menu.lng,
      photoFileId: menu.photoFileId,
      Description: typeof menu.Description === 'string' && menu.Description.startsWith('{')
        ? JSON.parse(menu.Description)?.EN || ''
        : menu.Description || ''
    };
  };

  const updateMenu = async () => {
    try {
      loading = true;
      const currentDate = new Date().toISOString();

      // Handle new photo upload if applicable
      if (newPhotoFile) {
        if (editMenuData.photoFileId) {
          try {
            await storage.deleteFile('66efdb420000df196b64', editMenuData.photoFileId);
          } catch (error) {
            console.error(`Error deleting old photo:`, error);
          }
        }

        try {
          const uploadResponse = await storage.createFile('66efdb420000df196b64', ID.unique(), newPhotoFile);
          editMenuData.photoFileId = uploadResponse.$id;
        } catch (error) {
          console.error('Error uploading new photo:', error);
          throw new Error('Failed to upload new photo');
        }

        newPhotoFile = null;
      }

      // Prepare the updated data
      const updatedData = {
        Route_name: editMenuData.Route_name,
        lat: editMenuData.lat,
        lng: editMenuData.lng,
        Description: editMenuData.Description,
        photoFileId: editMenuData.photoFileId,
        dateModified: currentDate,
      };

      // Update the original document
      await databases.updateDocument(databaseId, collectionId, editMenuData.id, updatedData);

      isEditing = false;
      editMenuData = {
        id: '',
        Route_name: '',
        lat: '',
        lng: '',
        Description: '',
        photoFileId: '',
      };

      await loadMenus();
    } catch (error) {
      console.error('Error updating menu:', error);
      message = 'Failed to update menu.';
    } finally {
      loading = false;
    }
  };

  const cancelEdit = () => {
    isEditing = false;
    editMenuData = {
      id: '',
      Route_name: '',
      lat: '',
      lng: '',
      Description: '',
      photoFileId: ''
    };
  };

  onMount(async () => {
    await loadMenus();
  });
</script>

<div class="container mx-auto px-4 py-8 pt-20">
  <div in:fly={{ y: 20, duration: 300 }}>
    <Card padding="p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">My Uploaded Menus</h1>
        <button 
          class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          on:click={() => goto('/create-quiz')}
        >
          <i class="fas fa-plus mr-2"></i> Upload New Menu
        </button>
      </div>
      
      {#if loading && !isEditing}
        <div class="flex justify-center items-center h-64">
          <Loading />
        </div>
      {:else if message && menus.length === 0}
        <div class="bg-gray-50 rounded-lg p-8 text-center">
          <div class="text-gray-400 mb-4">
            <i class="fas fa-utensils text-5xl"></i>
          </div>
          <h4 class="text-lg font-medium text-gray-800 mb-2">No Menus Uploaded Yet</h4>
          <p class="text-gray-600 mb-4">Share your restaurant menu with the world!</p>
          <button 
            class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            on:click={() => goto('/create-quiz')}
          >
            Upload Your First Menu
          </button>
        </div>
      {/if}

      {#if isEditing}
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold mb-4">Edit {editMenuData.Route_name}</h2>
          <form on:submit|preventDefault={updateMenu} class="space-y-6">
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
              <input 
                type="text" 
                bind:value={editMenuData.Route_name} 
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                required 
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Upload New Photo</label>
              <input 
                type="file" 
                accept="image/*" 
                on:change={handleFileChange} 
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              />
              {#if editMenuData.photoFileId}
                <div class="mt-2">
                  <p class="text-sm text-gray-500">Current photo:</p>
                  <img 
                    src={storage.getFilePreview('66efdb420000df196b64', editMenuData.photoFileId, 200)} 
                    alt="Current menu photo" 
                    class="mt-1 h-32 object-cover rounded-md" 
                  />
                </div>
              {/if}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input 
                  type="number" 
                  step="any" 
                  bind:value={editMenuData.lat} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                  required 
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input 
                  type="number" 
                  step="any" 
                  bind:value={editMenuData.lng} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                  required 
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Menu Description</label>
              <textarea 
                bind:value={editMenuData.Description} 
                rows="5"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                required
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3">
              <button 
                type="button" 
                class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                on:click={cancelEdit}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {#if loading}
                  <span class="inline-block animate-spin mr-2">⟳</span> Updating...
                {:else}
                  Update Menu
                {/if}
              </button>
            </div>
          </form>
        </div>
      {/if}
      
      <!-- Menu List -->
      {#if !isEditing && menus.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {#each menus as menu (menu.$id)}
            <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div class="h-48 overflow-hidden">
                <img 
                  src={storage.getFilePreview('66efdb420000df196b64', menu.photoFileId, 400)} 
                  alt={menu.Route_name} 
                  class="w-full h-full object-cover"
                  onerror="this.src='/placeholder-menu.jpg'"
                />
              </div>
              <div class="p-4">
                <h3 class="text-xl font-semibold text-gray-800">{menu.Route_name}</h3>
                <p class="text-gray-600 text-sm mt-2 line-clamp-2">
                  {typeof menu.Description === 'string' && menu.Description.startsWith('{') 
                    ? JSON.parse(menu.Description)?.EN || 'No description available'
                    : menu.Description || 'No description available'}
                </p>
                <p class="text-gray-500 text-xs mt-2">
                  Last updated: {new Date(menu.dateModified).toLocaleDateString()}
                </p>
                <div class="mt-4 flex justify-end space-x-2">
                  <button 
                    class="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                    on:click={() => initiateDelete(menu)}
                  >
                    Delete
                  </button>
                  <button 
                    class="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    on:click={() => editMenu(menu)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if menuToDelete}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg max-w-md w-full p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h3>
      <p class="text-gray-600 mb-2">Are you sure you want to delete <span class="font-semibold">{menuToDelete.Route_name}</span>?</p>
      <p class="text-gray-600 mb-4">This action cannot be undone.</p>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Enter the name <span class="font-semibold">{menuToDelete.Route_name}</span> to confirm:
        </label>
        <input
          type="text"
          bind:value={confirmationName}
          placeholder="Enter name to confirm"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {#if errorMessage}
          <p class="text-red-500 text-sm mt-1">{errorMessage}</p>
        {/if}
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          on:click={() => menuToDelete = null}
        >
          Cancel
        </button>
        <button 
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          on:click={() => confirmDelete(menuToDelete)} 
          disabled={deleteLoading}
        >
          {#if deleteLoading}
            <span class="inline-block animate-spin mr-2">⟳</span> Deleting...
          {:else}
            Delete
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
