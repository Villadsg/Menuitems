<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { checkUser, user } from '$lib/userStore'; // Import from auth.ts
  import { getCurrentLocation } from '$lib/location'; 
  import Map from '$lib/Map.svelte';

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
    <div class="pt-20">
    
    </div>
  {:else}
    <!-- Hero Section -->
    <div class="hero min-h-screen" style="background-image: url('/baggie4.jpg');">
      <div class="hero-overlay bg-black bg-opacity-50"></div>
      <div class="hero-content text-center text-neutral-content">
        <div class="max-w-md">
          <h1 class="text-4xl font-bold mb-6"> Combine nearby restaurant menus into one</h1>
          <div class="flex flex-col space-y-4">
            <a href="/find-quiz">
              <button class="bg-green-500 btn btn-primary w-full">Combined nearby Menu</button>
            </a>
            
            <a href="/addmenu">
              <button class="bg-green-500 btn btn-primary w-full">Add Your Menu</button>
            </a>
         
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Description Section -->
<div class="py-12 bg-base-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl font-bold text-center mb-8">Why MenuMap?</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> <!-- Reduced gap to 6 -->
      <!-- For Customers -->
      <div>
        <h3 class="text-xl font-semibold mb-4 text-center">For Customers</h3>
        <div class="space-y-3"> <!-- Reduced space-y to 3 -->
          <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4"> <!-- Reduced padding to 4 -->
              <p>See what your closest restaurants can offer today.</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4">
              <p>Discover unique dishes</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4">
              <p>Follow other customer's opinions on their specific order</p>
            </div>
          </div>
        </div>
      </div>

      <!-- For Shops -->
      <div>
        <h3 class="text-xl font-semibold mb-4 text-center">For Shops</h3>
        <div class="space-y-3"> <!-- Reduced space-y to 3 -->
          <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4">
              <p>Get your unique products highlighted in your area.</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4">
              <p>Let MenuMap improve and translate your menu for free.</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4">
              <p>Schedule permanent or temporary changes to the menu effortlessly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

    <!-- Footer -->
    <footer class="footer p-10 bg-neutral text-neutral-content">
      <div>
        <p class="font-bold">MenuMap™</p>
        <p>© 2024 - All rights reserved</p>
      </div> 
      <div>
        <span class="footer-title">Services</span> 
        <a href="/find-quiz" class="link link-hover">Find the menus nearby</a>
      </div> 
      <div>
        <span class="footer-title">Company</span> 
        <a href="/about" class="link link-hover">About</a>
        <a href="/contact" class="link link-hover">Contact</a>
      </div>
    </footer>
  {/if}
{:catch error}
  <!-- Error Handling -->
  <div class="alert alert-error shadow-lg max-w-md mx-auto mt-8">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Error loading user status: {error.message}</span>
    </div>
  </div>
{/await}