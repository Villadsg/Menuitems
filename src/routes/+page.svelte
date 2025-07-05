<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { checkUser, user } from '$lib/userStore'; // Import from auth.ts
  import { getCurrentLocation } from '$lib/location'; 
  import Map from '$lib/Map.svelte';
  import { fade, fly } from 'svelte/transition';
  import Card from '$lib/components/Card.svelte';

  // Writable store to manage the user state
  let userStatus = writable<Promise<null | object>>(null);
  let userLocation: [number, number] = [0, 0];

  onMount(async () => {
    checkUser(); // Check user login status when the component is mounted

    try {
      // Import DEFAULT_LOCATION for fallback
      const { DEFAULT_LOCATION } = await import('$lib/location');
      
      try {
        const location = await getCurrentLocation();
        userLocation = [location.latitude, location.longitude];
        console.log('Using user location:', userLocation);
      } catch (err) {
        // If there's an error getting the user's location, use Copenhagen as default
        userLocation = [DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude];
        console.log('Using default location (Copenhagen):', userLocation);
      }
    } catch (err) {
      console.error('Error in location handling:', err);
      // Hardcoded Copenhagen coordinates as last resort
      userLocation = [55.6761, 12.5683];
      console.log('Using hardcoded default location (Copenhagen):', userLocation);
    }
  });

  // Features section data
  const features = [
    {
      icon: 'fas fa-utensils',
      title: 'Local Menus as one Menu',
      description: 'Find and browse menu content from restaurants in your area and see it as just one big menu'
    },
    {
      icon: 'fas fa-language',
      title: 'Multi-Language Support',
      description: 'View menus in multiple languages including English, Spanish, Italian, Danish, and Japanese.'
    },
    {
      icon: 'fas fa-share-alt',
      title: 'Share Your Menu',
      description: 'Restaurant owners can add and update their menu content for customers to discover.'
    }
  ];

  // How it works steps
  const steps = [
    {
      number: '1',
      title: 'Create an Account',
      description: 'Sign up for free to access all features of MenuMap.'
    },
    {
      number: '2',
      title: 'Browse Nearby Menus',
      description: 'Discover places and their menu items around your location.'
    },
    {
      number: '3',
      title: 'Add Your Own Menu',
      description: 'Restaurant owners can easily add their menu items for customers to find.'
    }
  ];
</script>

<!-- Home page content -->
{#await $user}
  <!-- Loading Spinner -->
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
{:then user}
  {#if user}
    <!-- Show Map component when logged in -->
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div class="container mx-auto px-4 py-8">
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white/20">
          <h1 class="text-2xl font-bold mb-4 text-gray-800">Welcome back!</h1>
          <p class="text-gray-600 mb-6">Explore menus from restaurants around you or add your own menu items.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/find-quiz" class="block">
              <div class="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300 p-6 rounded-2xl border border-gray-200 flex items-center shadow-md hover:shadow-lg">
                <i class="fas fa-search text-3xl text-gray-500 mr-4"></i>
                <div>
                  <h3 class="text-xl font-semibold text-gray-800">Find Menu Items</h3>
                  <p class="text-gray-600">Browse and discover menu items near you</p>
                </div>
              </div>
            </a>
            
            <a href="/create-quiz" class="block">
              <div class="bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all duration-300 p-6 rounded-2xl border border-slate-200 flex items-center shadow-md hover:shadow-lg">
                <i class="fas fa-plus-circle text-3xl text-slate-500 mr-4"></i>
                <div>
                  <h3 class="text-xl font-semibold text-gray-800">Add Menu Items</h3>
                  <p class="text-gray-600">Share your restaurant's menu with others</p>
                </div>
              </div>
            </a>
          </div>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
          <h2 class="text-2xl font-bold mb-4 text-gray-800">Nearby menus</h2>
          <div class="h-96 w-full rounded-xl overflow-hidden">
            <Map />
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Hero Section -->
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
      <div class="text-center max-w-md mx-auto px-4">
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20">
          <h1 class="text-5xl font-bold mb-4 text-gray-800">Menu content near you</h1>
          <p class="text-xl mb-8 text-gray-600">Browse and compare menu content from places around you</p>
          <div class="flex flex-col space-y-4">
            <a href="/find-quiz">
              <button class="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-full w-full flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg">
                <i class="fas fa-search mr-2"></i> Browse Menu Content
              </button>
            </a>
            
            <a href="/create-quiz">
              <button class="bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-full w-full flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg">
                <i class="fas fa-plus-circle mr-2"></i> Add Your Menu
              </button>
            </a>
            
            <a href="/signup">
              <button class="bg-gray-100 text-gray-700 hover:bg-gray-200 py-3 px-6 rounded-full w-full flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md">
                <i class="fas fa-user-plus mr-2"></i> Sign Up Free
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <section class="py-16 bg-gradient-to-r from-gray-50 to-slate-50">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12 text-gray-800">Why Choose MenuMap?</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each features as feature}
            <div in:fade={{ delay: 200, duration: 300 }} class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-white/20">
              <div class="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="{feature.icon} text-2xl"></i>
              </div>
              <h3 class="text-xl font-semibold mb-2 text-gray-800">{feature.title}</h3>
              <p class="text-gray-600">{feature.description}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          {#each steps as step, i}
            <div in:fly={{ y: 20, delay: i * 150, duration: 300 }} class="relative">
              <div class="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 shadow-lg relative z-10 h-full border border-gray-100">
                <div class="bg-gradient-to-r from-gray-600 to-slate-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 class="text-xl font-semibold mb-2 text-gray-800">{step.title}</h3>
                <p class="text-gray-600">{step.description}</p>
              </div>
              
              {#if i < steps.length - 1}
                <div class="hidden md:block absolute top-1/2 right-0 w-1/2 h-0.5 bg-gradient-to-r from-gray-300 to-slate-300 z-0"></div>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="text-center mt-12">
          <a href="/signup" class="bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 text-white py-3 px-8 rounded-full inline-flex items-center transition-all duration-300 shadow-lg hover:shadow-xl">
            <span>Get Started Now</span>
            <i class="fas fa-arrow-right ml-2"></i>
          </a>
        </div>
      </div>
    </section>
  
  {/if}
{/await}