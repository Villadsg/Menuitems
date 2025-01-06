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
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-md"></span>
  </div>
{:then user}
  {#if user}
    <!-- Show Map component when logged in -->
    <div class="pt-20">
      <h1 class="text-2xl font-bold text-center mb-4">Map of Nearby Hidden Locations</h1>
      <Map />
    </div>
  {:else}
    <!-- Background image section using Tailwind CSS for not logged-in users -->
    <div class="bg-cover bg-center bg-no-repeat h-screen" style="background-image: url('/baggie4.jpg')">
      <div class="flex flex-col items-center justify-center h-full bg-black bg-opacity-50">
        <div class="text-center text-white p-4">
          <h1 class="text-4xl font-bold mb-4">Find Menus Nearby</h1>

          <div class="space-y-4">
            <a href="/find-quiz">
              <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
                Explore Menus
              </button>
            </a>
            <a href="/addmenu">
              <button class="bg-green-500 border border-green-500 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-full transition duration-300">
                Add Your Menu
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Description Section -->
    <div class="py-12 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-center mb-8">Why MenuMap?</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
     

          <!-- For Visitors -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">For Customers</h3>
            <ul class="space-y-4">
              <li class="flex items-start">
                <span class="text-green-500 mr-2">-</span>
                <span>See what your closest restaurants can offer today.</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">-</span>
                <span>Discover hidden gems and unique dishes</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">-</span>
                <span>Follow other customer's opinions on their order and not just the place</span>
              </li>
            </ul>
          </div>

               <!-- For Shops -->
               <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4">For Shops</h3>
                <ul class="space-y-4">
                  <li class="flex items-start">
                    <span class="text-green-500 mr-2">-</span>
                    <span>Get your unique products highlighted in your area.</span>
                  </li>
                  <li class="flex items-start">
                    <span class="text-green-500 mr-2">-</span>
                    <span>Let MenuMap improve and translate your menu for free.</span>
                  </li>
                  <li class="flex items-start">
                    <span class="text-green-500 mr-2">-</span>
                    <span>Schedule permanent or temporary changes to the menu effortlessly.</span>
                  </li>
                </ul>
              </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer p-5 bg-neutral text-neutral-content">
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
  <!-- No need to treat it as a critical error -->
  <div>Error loading user status: {error.message}</div>
{/await}