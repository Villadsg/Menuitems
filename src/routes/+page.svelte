<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentLocation } from '$lib/location';
  import Map from '$lib/Map.svelte';
  import { fade, fly } from 'svelte/transition';

  let userLocation: [number, number] = [0, 0];

  onMount(async () => {
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
      icon: 'fas fa-mobile-alt',
      title: 'Digitalize Your Menu for Free',
      description: 'Transform your physical menu into a digital format at no cost - simply upload photos and let our system do the rest'
    },
    {
      icon: 'fas fa-lightbulb',
      title: 'Get Menu Item Suggestions',
      description: 'Receive AI-powered suggestions for new menu items based on your current offerings and location trends'
    },
    {
      icon: 'fas fa-star',
      title: 'Highlight Your Best Items',
      description: 'Using the platform, your unique or best items get highlighted in search results, helping customers discover your signature dishes'
    },
    {
      icon: 'fas fa-utensils',
      title: 'Local Menus as One Menu',
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
      title: 'Browse Nearby Menus',
      description: 'Discover restaurants and their menu items around your location on the map.'
    },
    {
      number: '2',
      title: 'Add Your Own Menu',
      description: 'Upload photos of your menu and our OCR will digitize it automatically.'
    },
    {
      number: '3',
      title: 'Search & Discover',
      description: 'Find specific menu items across all local restaurants in one place.'
    }
  ];
</script>

<!-- Home page content -->
<div class="min-h-screen bg-gradient-to-br from-gray-50 to-white">
  <!-- Hero Section with Quick Actions -->
  <div class="container mx-auto px-6 py-12">
    <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm p-8 mb-12 border border-gray-100/50">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-light mb-4 text-gray-900 tracking-tight leading-tight">MenuMap</h1>
        <p class="text-lg text-gray-600 font-light leading-relaxed">Browse and discover menu items from local restaurants in one place</p>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
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
            <p class="text-sm text-gray-600 text-center font-light">Upload and digitalize your menu for free</p>
          </div>
        </a>
      </div>
    </div>

    <!-- Map Section -->
    <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm p-8 mb-12 border border-gray-100/50">
      <h2 class="text-2xl font-light mb-6 text-gray-900 tracking-tight">Nearby restaurants</h2>
      <div class="h-96 w-full rounded-2xl overflow-hidden">
        <Map />
      </div>
    </div>
  </div>

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
    </div>
  </section>
</div>
