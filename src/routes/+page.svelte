<script lang="ts">
  import { account } from '$lib/appwrite';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Writable store to manage the user state
  let userStatus = writable<Promise<null | object>>(null);

  // Function to check user login status
  const checkUser = async () => {
    try {
      const currentUser = await account.get();
      return currentUser; // Return user object if logged in
    } catch (error) {
      return null; // Return null if no user is logged in
    }
  };

  // Run checkUser when the component is mounted and store the promise
  onMount(() => {
    userStatus.set(checkUser());
  });

</script>

<!-- Home page content -->
{#await $userStatus}
<div class="flex items-center justify-center h-screen">
<span class="loading loading-spinner loading-md"></span>
</div>
{:then user}
  {#if user}
    <!-- Show MonumentFinder component when logged in -->
    <div class="pt-20">
      <p>Here is some interesting info and news. How to connect with other language learners? </p>
    </div>
  {:else}
    <!-- Background image section using Tailwind CSS for not logged-in users -->
    <div class="bg-cover bg-center bg-no-repeat h-[140vh]" style="background-image: url('/back.jpeg')">
      <div class="flex items-start justify-center h-full bg-black bg-opacity-50 pt-60">
        <div class="text-center text-white p-4" style="text-shadow: 1px 1px 2px black;">
          <h1 class="text-4xl font-bold">Complete tours and learn a language</h1>
          <p class="mt-4">And gain points and vouchers for local shops</p>
          <p class="mt-4">Create routes and become a tour designer</p>
          <a href="/selectlanguage">
            <button class="mt-8 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Try a route
            </button>
          </a>
        </div>
      </div>
    </div>

    <!-- DaisyUI Footer -->
    <footer class="footer p-10 bg-neutral text-neutral-content">
      <div>
        <p class="font-bold">Langtour™</p>
        <p>© 2024 - All rights reserved</p>
      </div> 
      <div>
        <span class="footer-title">Services</span> 
        <a href="/about" class="link link-hover">About</a>
        <a href="/selectlanguage" class="link link-hover">Try a route</a>
      </div> 
      <div>
        <span class="footer-title">Company</span> 
        <a href="/about" class="link link-hover">About</a>
        <a href="/contact" class="link link-hover">Contact</a>
      </div>
    </footer>
  {/if}

{:catch error}
  <div>Error loading user status: {error.message}</div>
{/await}
