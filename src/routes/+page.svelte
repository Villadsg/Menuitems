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
    <div class="bg-cover bg-center bg-no-repeat h-screen" style="background-image: url('/back.jpeg')">
      <div class="flex flex-col items-center justify-center h-full bg-black bg-opacity-50">
        <div class="text-center text-white p-4">
          <h1 class="text-4xl font-bold mb-4">Find Menus Nearby</h1>
          <p class="mb-6">Get a quick overview of available food options.</p>
          <div class="space-y-4">
            <a href="/find-quiz">
              <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition duration-300">
                Explore Menus
              </button>
            </a>
            <a href="/find-quiz">
              <button class="bg-transparent border border-green-500 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-full transition duration-300">
                Add Your Menu
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer p-5 bg-neutral text-neutral-content">
      <div>
        <p class="font-bold">Langtour™</p>
        <p>© 2024 - All rights reserved</p>
      </div> 
      <div>
        <span class="footer-title">Services</span> 
        <a href="/selectlanguage" class="link link-hover">Find the Closest Route</a>
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