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
      description: 'Filter and find menu content from restaurants in your area and see it as just one big menu'
    },
    {
      icon: 'fas fa-language',
      title: 'Multi-Language Support',
      description: 'View menu content in original language or translated'
    },
    {
      icon: 'fas fa-share-alt',
      title: 'Share A Menu',
      description: 'Share or update menu content for customers to discover and get future discounts'
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
      description: 'Owners can easily add their menu items for customers to find.'
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
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div class="container mx-auto px-6 py-12">
        <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm p-8 mb-12 border border-gray-100/50">
          <h1 class="text-3xl font-light mb-6 text-gray-900 tracking-tight">Welcome back!</h1>
          <p class="text-lg text-gray-600 mb-8 font-light leading-relaxed">Explore menus from restaurants around you or add your own menu items.</p>
          
          <div class="flex flex-col sm:flex-row gap-4">
            <a href="/find-quiz" class="flex-1">
              <div class="bg-white hover:bg-gray-50 transition-all duration-200 p-6 rounded-2xl border border-gray-200/60 hover:border-gray-300/80 shadow-sm hover:shadow-md group">
                <div class="flex items-center justify-center mb-4">
                  <div class="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <i class="fas fa-search text-white text-lg"></i>
                  </div>
                </div>
                <h3 class="text-lg font-medium text-gray-900 text-center mb-2">Find Menu Items</h3>
                <p class="text-sm text-gray-600 text-center font-light">Browse and discover menu items near you</p>
              </div>
            </a>
            
            <a href="/create-quiz" class="flex-1">
              <div class="bg-white hover:bg-gray-50 transition-all duration-200 p-6 rounded-2xl border border-gray-200/60 hover:border-gray-300/80 shadow-sm hover:shadow-md group">
                <div class="flex items-center justify-center mb-4">
                  <div class="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <i class="fas fa-plus-circle text-white text-lg"></i>
                  </div>
                </div>
                <h3 class="text-lg font-medium text-gray-900 text-center mb-2">Add Menu Items</h3>
                <p class="text-sm text-gray-600 text-center font-light">Share your restaurant's menu with others</p>
              </div>
            </a>
          </div>
        </div>
        
        <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm p-8 border border-gray-100/50">
          <h2 class="text-2xl font-light mb-6 text-gray-900 tracking-tight">Nearby menus</h2>
          <div class="h-96 w-full rounded-2xl overflow-hidden">
            <Map />
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Hero Section -->
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div class="text-center max-w-lg mx-auto px-6">
        <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm p-12 border border-gray-100/50">
          <h1 class="text-4xl font-light mb-6 text-gray-900 tracking-tight leading-tight">Menu content</h1>
          <p class="text-lg mb-12 text-gray-600 font-light leading-relaxed">Browse and find highly rated menu content near you</p>
          <div class="flex flex-col space-y-3">
            <a href="/find-quiz">
              <button class="bg-stone-100 py-4 px-8 hover:bg-stone-200 rounded-xl w-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm tracking-wide">
                <i class="fas fa-search mr-3"></i> Browse Menu Content
              </button>
            </a>
            
            <a href="/create-quiz">
              <button class="bg-stone-100 hover:bg-stone-200 text-stone-700 py-4 px-8 rounded-xl w-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm tracking-wide">
                <i class="fas fa-plus-circle mr-3"></i> Add Your Menu
              </button>
            </a>
            
            <a href="/signup">
              <button class="bg-transparent border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-700 py-4 px-8 rounded-xl w-full flex items-center justify-center transition-all duration-200 hover:bg-stone-50 font-medium text-sm tracking-wide">
                <i class="fas fa-user-plus mr-3"></i> Sign Up Free
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-6">
        <h2 class="text-3xl font-light text-center mb-16 text-gray-900 tracking-tight">Why Choose MenuMap?</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {#each features as feature}
            <div in:fade={{ delay: 200, duration: 300 }} class="bg-stone-50/50 rounded-2xl p-8 text-center hover:bg-stone-50 transition-all duration-200 border border-stone-100/50">
              <div class="w-14 h-14 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="{feature.icon} text-white text-lg"></i>
              </div>
              <h3 class="text-lg font-medium mb-4 text-stone-800">{feature.title}</h3>
              <p class="text-sm text-stone-600 font-light leading-relaxed">{feature.description}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-20 bg-gray-50/30">
      <div class="container mx-auto px-6">
        <h2 class="text-3xl font-light text-center mb-16 text-gray-900 tracking-tight">How It Works</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {#each steps as step, i}
            <div in:fly={{ y: 20, delay: i * 150, duration: 300 }} class="relative">
              <div class="bg-white rounded-2xl p-8 shadow-sm relative z-10 h-full border border-stone-100/50">
                <div class="w-10 h-10 bg-orange-400 text-white rounded-full flex items-center justify-center text-sm font-medium mb-6">
                  {step.number}
                </div>
                <h3 class="text-lg font-medium mb-4 text-stone-800">{step.title}</h3>
                <p class="text-sm text-stone-600 font-light leading-relaxed">{step.description}</p>
              </div>
              
              {#if i < steps.length - 1}
                <div class="hidden md:block absolute top-1/2 right-0 w-1/2 h-px bg-stone-200 z-0"></div>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="text-center mt-16">
          <a href="/signup" class="bg-orange-400 hover:bg-orange-500 text-white py-4 px-10 rounded-xl inline-flex items-center transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm tracking-wide">
            <span>Get Started Now</span>
            <i class="fas fa-arrow-right ml-3"></i>
          </a>
        </div>
      </div>
    </section>
  
  {/if}
{/await}