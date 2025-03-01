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
      const location = await getCurrentLocation();
      userLocation = [location.latitude, location.longitude];
    } catch (err) {
      console.error('Error fetching location:', err);
    }
  });

  // Features section data
  const features = [
    {
      icon: 'fas fa-utensils',
      title: 'Local Menus',
      description: 'Find and browse menu content from restaurants in your area'
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
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 class="text-2xl font-bold mb-4">Welcome back!</h1>
        <p class="text-gray-600 mb-6">Explore menus from restaurants around you or add your own menu items.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/find-quiz" class="block">
            <div class="bg-green-50 hover:bg-green-100 transition-colors p-6 rounded-lg border border-green-200 flex items-center">
              <i class="fas fa-search text-3xl text-green-500 mr-4"></i>
              <div>
                <h3 class="text-xl font-semibold text-green-800">Find Menu Items</h3>
                <p class="text-green-600">Browse and discover menu items near you</p>
              </div>
            </div>
          </a>
          
          <a href="/create-quiz" class="block">
            <div class="bg-blue-50 hover:bg-blue-100 transition-colors p-6 rounded-lg border border-blue-200 flex items-center">
              <i class="fas fa-plus-circle text-3xl text-blue-500 mr-4"></i>
              <div>
                <h3 class="text-xl font-semibold text-blue-800">Add Menu Items</h3>
                <p class="text-blue-600">Share your restaurant's menu with others</p>
              </div>
            </div>
          </a>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold mb-4">Nearby Restaurants</h2>
        <div class="h-96 w-full">
          <Map />
        </div>
      </div>
    </div>
  {:else}
    <!-- Hero Section -->
    <div class="hero min-h-screen" style="background-image: url('/baggie4.jpg');">
      <div class="hero-overlay bg-black bg-opacity-50"></div>
      <div class="hero-content text-center text-neutral-content">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold mb-4">Discover Menu Content</h1>
          <p class="text-xl mb-8">Browse and compare menu content from places around you</p>
          <div class="flex flex-col space-y-4">
            <a href="/find-quiz">
              <button class="bg-green-500 hover:bg-green-600 transition-colors btn btn-primary w-full flex items-center justify-center">
                <i class="fas fa-search mr-2"></i> Browse Menus
              </button>
            </a>
            
            <a href="/create-quiz">
              <button class="bg-green-500 hover:bg-green-600 transition-colors btn btn-primary w-full flex items-center justify-center">
                <i class="fas fa-plus-circle mr-2"></i> Add Your Menu
              </button>
            </a>
            
            <a href="/signup">
              <button class="bg-white text-green-600 hover:bg-green-50 transition-colors btn w-full flex items-center justify-center">
                <i class="fas fa-user-plus mr-2"></i> Sign Up Free
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <section class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Why Choose MenuMap?</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {#each features as feature}
            <div in:fade={{ delay: 200, duration: 300 }} class="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
              <div class="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="{feature.icon} text-2xl"></i>
              </div>
              <h3 class="text-xl font-semibold mb-2">{feature.title}</h3>
              <p class="text-gray-600">{feature.description}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-16 bg-gray-50">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          {#each steps as step, i}
            <div in:fly={{ y: 20, delay: i * 150, duration: 300 }} class="relative">
              <div class="bg-white rounded-lg p-8 shadow-md relative z-10 h-full">
                <div class="bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 class="text-xl font-semibold mb-2">{step.title}</h3>
                <p class="text-gray-600">{step.description}</p>
              </div>
              
              {#if i < steps.length - 1}
                <div class="hidden md:block absolute top-1/2 right-0 w-1/2 h-0.5 bg-green-300 z-0"></div>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="text-center mt-12">
          <a href="/signup" class="bg-green-500 hover:bg-green-600 text-white py-3 px-8 rounded-lg inline-flex items-center transition-colors">
            <span>Get Started Now</span>
            <i class="fas fa-arrow-right ml-2"></i>
          </a>
        </div>
      </div>
    </section>
  
  {/if}
{/await}