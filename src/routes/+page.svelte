<script lang="ts">
  import { account } from '$lib/appwrite';
  import MonumentFinder from '$lib/MonumentFinder.svelte';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { Spinner } from 'flowbite-svelte';
  import { Footer, FooterCopyright, FooterLinkGroup, FooterLink } from 'flowbite-svelte';

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

  const login = async () => {
    try {
      await account.createEmailPasswordSession(email, password);
      userStatus.set(checkUser()); // Refresh user state by checking again
    } catch (error) {
      console.error('Login error:', error.message);
      alert('Login failed: ' + error.message);
    }
  };

</script>

<!-- Home page content -->
{#await $userStatus}
<Spinner />
{:then user}
  {#if user}
    <!-- Show MonumentFinder component when logged in -->
    <div class="pt-20">
      <MonumentFinder />
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
  {/if}


  <Footer class="bg-transparent">
    <div class="sm:flex sm:items-center sm:justify-between">
    <FooterCopyright href="/" by="Langtour™" year={2024} />
    <FooterLinkGroup ulClass="flex flex-wrap items-center mt-3 text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
      <FooterLink href="/about">About</FooterLink>
    </FooterLinkGroup>
    </div>
  </Footer>

{:catch error}
  <div>Error loading user status: {error.message}</div>
{/await}

