

<script lang="ts">
  import { getCurrentLocation, calculateDistance } from '$lib/location'; // Import location utilities
  import { databases } from '$lib/appwrite'; // Import the initialized Appwrite client
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
  
  // Define types for menu items
  interface MenuItem {
    id: string;
    name: string;
    price: string | null;
    description: string;
    category: string;
    restaurantName: string;
    restaurantId: string;
    distance: number;
    lat: number;
    lng: number;
    expanded?: boolean;
  }

  // State variables
  let status = '';
  let loading = true;
  let searchQuery = '';
  const databaseId = '6609473fbde756e5dc45';  
  const collectionId = '66eefaaf001c2777deb9';  
  const userCollectionId = '66fbb317002371bfdffc'; 
  let latitude: number | null = null;
  let longitude: number | null = null;
  let allMenuItems: MenuItem[] = [];
  let filteredMenuItems: MenuItem[] = [];

  // Function to process menu items from a document
  const processMenuItems = (items: any[], doc: any, category = '') => {
    return items.map((item: any) => ({
      id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
      name: item.name || 'Unnamed Item',
      price: item.price || null,
      description: item.description || '',
      category: category || item.category || 'Uncategorized',
      restaurantName: doc.Route_name || 'Unknown Restaurant',
      restaurantId: doc.$id,
      lat: parseFloat(doc.lat) || 0,
      lng: parseFloat(doc.lng) || 0,
      distance: 0 // Will be calculated later
    }));
  };

  // Function to load all menu items
  const loadAllMenuItems = async () => {
    try {
      loading = true;
      const response = await databases.listDocuments(databaseId, collectionId);
      console.log(`Loaded ${response.documents.length} restaurant documents`);
      
      const tempMenuItems: MenuItem[] = [];
      
      for (const doc of response.documents) {
        if (!doc.ocrdata) {
          console.log(`Document ${doc.$id} (${doc.Route_name}) has no ocrdata`);
          continue;
        }
        
        try {
          const parsedData = JSON.parse(doc.ocrdata);
          
          // Handle flat array of menu items
          if (Array.isArray(parsedData)) {
            const restaurantItems = processMenuItems(parsedData, doc);
            tempMenuItems.push(...restaurantItems);
          } 
          // Handle structured format with sections
          else if (parsedData.sections && Array.isArray(parsedData.sections)) {
            for (const section of parsedData.sections) {
              if (section.items && Array.isArray(section.items)) {
                const sectionItems = processMenuItems(section.items, doc, section.name);
                tempMenuItems.push(...sectionItems);
              }
            }
          } else {
            console.log(`Document ${doc.$id} has invalid ocrdata structure`);
          }
        } catch (error: any) {
          console.error(`Error parsing menu data for ${doc.Route_name}:`, error);
        }
      }
      
      console.log(`Total menu items loaded: ${tempMenuItems.length}`);
      return tempMenuItems;
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      return [];
    } finally {
      loading = false;
    }
  };

  // Function to find location and sort items
  const findLocationAndSortItems = async () => {
    try {
      const { DEFAULT_LOCATION } = await import('$lib/location');
      const location = await getCurrentLocation();
      latitude = location.latitude;
      longitude = location.longitude;
      
      status = (latitude === DEFAULT_LOCATION.latitude && longitude === DEFAULT_LOCATION.longitude)
        ? `Using default location (Copenhagen). Menu items are sorted by distance from there.`
        : `Using your current location. Items sorted by distance.`;

      const items = await loadAllMenuItems();
      
      // Calculate distance for each menu item and sort
      allMenuItems = items
        .map(item => {
          const distance = calculateDistance(latitude!, longitude!, item.lat, item.lng);
          return { ...item, distance };
        })
        .sort((a, b) => a.distance - b.distance);
        
      // Initialize filtered items
      filteredMenuItems = [...allMenuItems];
    } catch (error: any) {
      console.error('Error in findLocationAndSortItems:', error);
      const { DEFAULT_LOCATION } = await import('$lib/location');
      latitude = DEFAULT_LOCATION.latitude;
      longitude = DEFAULT_LOCATION.longitude;
      status = `Using default location (Copenhagen). Error: ${error.message}`;
      
      const items = await loadAllMenuItems();
      allMenuItems = items
        .map(item => {
          const distance = calculateDistance(latitude!, longitude!, item.lat, item.lng);
          return { ...item, distance };
        })
        .sort((a, b) => a.distance - b.distance);
      
      filteredMenuItems = [...allMenuItems];
    }
  };
  
  // Function to filter menu items based on search query
  $: {
    if (allMenuItems.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        filteredMenuItems = allMenuItems.filter(item => 
          item.name.toLowerCase().includes(query) || 
          item.description.toLowerCase().includes(query) || 
          item.category.toLowerCase().includes(query) ||
          item.restaurantName.toLowerCase().includes(query)
        );
      } else {
        filteredMenuItems = [...allMenuItems];
      }
    }
  }
  
  function navigateToHome() {
    goto('/');
  }

  onMount(async () => {
    await findLocationAndSortItems();
  });
</script>

<div class="max-w-4xl mx-auto p-6 pt-20">
  <!-- Status message -->
  {#if status}
    <div class="mb-4 text-sm text-center text-gray-600">{status}</div>
  {/if}
  
  <h1 class="text-2xl font-bold mb-6 text-center">All Menu Items</h1>
  
  <!-- Loading indicator -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- Search field -->
    <div class="mb-6 max-w-2xl mx-auto">
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search menu items, categories, or restaurants..."
          class="w-full p-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg 
          class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        {#if searchQuery}
          <button 
            class="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            on:click={() => searchQuery = ''}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        {/if}
      </div>
    </div>
    
    <!-- Results count -->
    <div class="text-sm text-center text-gray-600 mb-4">
      {filteredMenuItems.length} {filteredMenuItems.length === 1 ? 'item' : 'items'} found
      {#if searchQuery && filteredMenuItems.length !== allMenuItems.length}
        <span>for "{searchQuery}"</span>
      {/if}
    </div>

    <!-- Menu items list -->
    {#if filteredMenuItems.length > 0}
      <div class="grid grid-cols-1 gap-4 mb-8 max-w-2xl mx-auto">
        {#each filteredMenuItems as menuItem}
          <div class="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <!-- Item header (always visible) -->
            <button 
              class="w-full p-4 text-left focus:outline-none" 
              on:click={() => menuItem.expanded = !menuItem.expanded}
            >
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-medium text-gray-800">{menuItem.name}</h3>
                  <p class="text-sm text-gray-500">{menuItem.category}</p>
                </div>
                <div class="flex items-center">
                  {#if menuItem.price}
                    <span class="text-green-600 font-semibold mr-2">{menuItem.price}</span>
                  {/if}
                  <svg 
                    class="w-4 h-4 text-gray-500 transition-transform duration-200 ease-in-out {menuItem.expanded ? 'transform rotate-180' : ''}" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              
              <!-- Restaurant and distance info (always visible) -->
              <div class="mt-2 text-xs text-gray-500">
                <p>From: <span class="font-medium">{menuItem.restaurantName}</span> · <span class="font-medium">{menuItem.distance.toFixed(2)} km</span></p>
              </div>
            </button>
            
            <!-- Expanded content (only visible when expanded) -->
            {#if menuItem.expanded}
              <div 
                class="px-4 pb-4 pt-0 bg-gray-50 border-t border-gray-100 animate-fadeIn"
                transition:slide={{ duration: 200 }}
              >
                {#if menuItem.description}
                  <div class="mt-2">
                    <h4 class="text-xs font-semibold text-gray-700 uppercase">Description</h4>
                    <p class="text-sm text-gray-600">{menuItem.description}</p>
                  </div>
                {/if}
                
                <div class="mt-3 flex justify-between items-center">
                  <span class="text-xs text-gray-500">ID: {menuItem.id.substring(0, 8)}...</span>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-center text-gray-500 py-8">No menu items found matching your search</p>
    {/if}
    
    <!-- Back to home button -->
    <button
      class="btn btn-outline w-full mt-6"
      on:click={navigateToHome}
    >
      Back to Home
    </button>
  {/if}
</div>

<style>
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>