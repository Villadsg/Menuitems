<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { databases, storage } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { fly, fade } from 'svelte/transition';
  import Card from '$lib/components/Card.svelte';
  import Loading from '$lib/components/Loading.svelte';

  const menuId = $page.params.id;
  let menu = null;
  let loading = true;
  let ocrData = null;
  let menuItems = [];

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';

  onMount(async () => {
    try {
      loading = true;
      
      // Fetch the menu document
      const menuDoc = await databases.getDocument(databaseId, collectionId, menuId);
      menu = menuDoc;
      
      // Process OCR data if available
      if (menu.ocrdata) {
        try {
          ocrData = JSON.parse(menu.ocrdata);
          if (ocrData && ocrData.menuItems) {
            menuItems = ocrData.menuItems;
          }
        } catch (error) {
          console.error('Error parsing OCR data:', error);
        }
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      loading = false;
    }
  });

  function getFileViewUrl(fileId) {
    if (!fileId) return '/placeholder-menu.jpg';
    return storage.getFileView('66efdb420000df196b64', fileId);
  }
  
  function goBack() {
    goto('/profile');
  }
</script>

<div class="container mx-auto px-4 py-8 pt-20">
  <div in:fly={{ y: 20, duration: 300 }}>
    {#if loading}
      <div class="flex justify-center items-center h-64">
        <Loading />
      </div>
    {:else if menu}
      <Card padding="p-6">
        <div class="mb-4">
          <button 
            class="text-blue-600 hover:text-blue-800 flex items-center"
            on:click={goBack}
          >
            <i class="fas fa-arrow-left mr-2"></i> Back to Profile
          </button>
        </div>
        
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Menu Image -->
          <div class="w-full md:w-1/2">
            <img 
              src={getFileViewUrl(menu.photoFileId)} 
              alt={menu.Route_name} 
              class="w-full h-auto rounded-lg shadow-md"
            />
          </div>
          
          <!-- Menu Details -->
          <div class="w-full md:w-1/2">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">{menu.Route_name}</h1>
            
            <div class="flex items-center text-gray-500 mb-4">
              <i class="fas fa-map-marker-alt mr-2"></i>
              <span>Coordinates: {menu.lat}, {menu.lng}</span>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
              <h2 class="text-xl font-semibold mb-2">Description</h2>
              <p class="text-gray-700 whitespace-pre-line">
                {typeof menu.Description === 'string' && menu.Description.startsWith('{') 
                  ? JSON.parse(menu.Description)?.EN || 'No description available'
                  : menu.Description || 'No description available'}
              </p>
            </div>
            
            <div class="mb-4">
              <p class="text-gray-500 text-sm">
                Uploaded: {new Date(menu.dateModified).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Menu Items from OCR -->
        {#if menuItems.length > 0}
          <div class="mt-8" in:fade={{ duration: 300, delay: 200 }}>
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Menu Items</h2>
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each menuItems as item}
                    {#if item.name}
                      <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">{item.description || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category || 'Uncategorized'}</td>
                      </tr>
                    {:else if item.category}
                      <tr class="bg-gray-50">
                        <td colspan="4" class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {item.category}
                        </td>
                      </tr>
                    {/if}
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
        
        <!-- Raw OCR Text -->
        {#if ocrData && ocrData.rawText}
          <div class="mt-8" in:fade={{ duration: 300, delay: 300 }}>
            <details class="bg-gray-50 rounded-lg p-4">
              <summary class="text-lg font-semibold cursor-pointer">View Raw OCR Text</summary>
              <div class="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto max-h-96">
                <pre class="text-gray-700 text-sm whitespace-pre-wrap">{ocrData.rawText}</pre>
              </div>
            </details>
          </div>
        {/if}
      </Card>
    {:else}
      <Card padding="p-6">
        <div class="text-center py-8">
          <div class="text-red-500 mb-4">
            <i class="fas fa-exclamation-circle text-5xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Menu Not Found</h2>
          <p class="text-gray-600 mb-6">The menu you're looking for doesn't exist or has been removed.</p>
          <button 
            class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            on:click={goBack}
          >
            Return to Profile
          </button>
        </div>
      </Card>
    {/if}
  </div>
</div>
