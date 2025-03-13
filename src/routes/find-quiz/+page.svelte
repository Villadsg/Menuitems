

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
  const databaseId = '6609473fbde756e5dc45';  
  const collectionId = '66eefaaf001c2777deb9';  
  const userCollectionId = '66fbb317002371bfdffc'; 
  let latitude: number | null = null;
  let longitude: number | null = null;
  let allMenuItems: MenuItem[] = [];


const loadAllMenuItems = async () => {
  try {
    loading = true;
    // Fetch all documents from the collection
    const response = await databases.listDocuments(databaseId, collectionId);
    
    console.log(`Loaded ${response.documents.length} restaurant documents`);
    
    // Temporary array to collect all menu items
    const tempMenuItems: MenuItem[] = [];
    
    // Process each restaurant document
    for (const doc of response.documents) {
      // Skip if no ocrdata available
      if (!doc.ocrdata) {
        console.log(`Document ${doc.$id} (${doc.Route_name}) has no ocrdata`);
        continue;
      }
      
      try {
        const parsedData = JSON.parse(doc.ocrdata);
        
        // Check if the data is an array (flat list of menu items)
        if (Array.isArray(parsedData)) {
          console.log(`Found ${parsedData.length} menu items for ${doc.Route_name || 'Unknown restaurant'}`);
          
          // Process flat array of menu items
          const restaurantItems = parsedData.map((item: any) => ({
            id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
            name: item.name || 'Unnamed Item',
            price: item.price || null,
            description: item.description || '',
            category: item.category || 'Uncategorized',
            restaurantName: doc.Route_name || 'Unknown Restaurant',
            restaurantId: doc.$id,
            lat: parseFloat(doc.lat) || 0,
            lng: parseFloat(doc.lng) || 0,
            distance: 0 // Will be calculated later
          }));
          
          console.log(`Added ${restaurantItems.length} menu items from ${doc.Route_name || 'Unknown restaurant'}`);
          
          // Add items to our collection
          tempMenuItems.push(...restaurantItems);
        } 
        // Check if it's the structured format with sections
        else if (parsedData.sections && Array.isArray(parsedData.sections)) {
          console.log(`Found ${parsedData.sections.length} menu sections for ${doc.Route_name}`);
          
          // Flatten all menu items from all sections
          const restaurantItems = parsedData.sections.flatMap((section: { name: string; items: any[] }) => {
            if (!section.items || !Array.isArray(section.items)) {
              console.log(`Section ${section.name} has no valid items array`);
              return [];
            }
            
            return section.items.map((item: any) => ({
              id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
              name: item.name || 'Unnamed Item',
              price: item.price || null,
              description: item.description || '',
              category: section.name,
              restaurantName: doc.Route_name || 'Unknown Restaurant',
              restaurantId: doc.$id,
              lat: parseFloat(doc.lat) || 0,
              lng: parseFloat(doc.lng) || 0,
              distance: 0 // Will be calculated later
            }));
          });
          
          console.log(`Added ${restaurantItems.length} menu items from ${doc.Route_name}`);
          
          // Add items to our collection
          tempMenuItems.push(...restaurantItems);
        } else {
          console.log(`Document ${doc.$id} (${doc.Route_name || 'Unknown'}) has invalid ocrdata structure:`, typeof parsedData);
        }
      } catch (error: any) {
        console.error(`Error parsing menu data for ${doc.Route_name}:`, error);
      }
    }
    
    console.log(`Total menu items loaded: ${tempMenuItems.length}`);
    
    // Return the collected menu items
    return tempMenuItems;
  } catch (error: any) {
    console.error('Error loading menu items:', error);
    return [];
  } finally {
    loading = false;
  }
};

const findLocationAndSortItems = async () => {
  try {
    // Import DEFAULT_LOCATION for fallback
    const { DEFAULT_LOCATION } = await import('$lib/location');
    
    // Get user's location or use default Copenhagen location
    const location = await getCurrentLocation();
    latitude = location.latitude;
    longitude = location.longitude;
    
    // If using default location, indicate this in the status
    if (latitude === DEFAULT_LOCATION.latitude && longitude === DEFAULT_LOCATION.longitude) {
      status = `Using default location (Copenhagen). Menu items are sorted by distance from there.`;
    } else {
      status = `Using your current location. Items sorted by distance.`;
    }

    // Get all menu items
    const items = await loadAllMenuItems();
    
    // Calculate distance for each menu item and sort
    allMenuItems = items
      .map(item => {
        // Use non-null assertion since we know latitude and longitude are set above
        const distance = calculateDistance(latitude!, longitude!, item.lat, item.lng);
        return { ...item, distance };
      })
      .sort((a, b) => a.distance - b.distance);
      
  } catch (error: any) {
    console.error('Error in findLocationAndSortItems:', error);
    // Import DEFAULT_LOCATION for fallback in case of error
    const { DEFAULT_LOCATION } = await import('$lib/location');
    latitude = DEFAULT_LOCATION.latitude;
    longitude = DEFAULT_LOCATION.longitude;
    status = `Using default location (Copenhagen). Error: ${error.message}`;
    
    // Get all menu items
    const items = await loadAllMenuItems();
    
    // Calculate distances from default location
    allMenuItems = items
      .map(item => {
        const distance = calculateDistance(latitude!, longitude!, item.lat, item.lng);
        return { ...item, distance };
      })
      .sort((a, b) => a.distance - b.distance);
  }
};
  
  
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
    <!-- Menu items list -->
    {#if allMenuItems.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {#each allMenuItems as menuItem}
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
      <p class="text-center text-gray-500 py-8">No menu items found</p>
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