<script lang="ts">
    import '../app.css'; // Import Tailwind CSS
    import { user, checkUser } from '$lib/userStore';
    import { onMount } from 'svelte';
    import { account } from '$lib/appwrite';
	  import { goto } from '$app/navigation';
    import "mapbox-gl/dist/mapbox-gl.css";
    import { toasts } from '$lib/stores/toastStore';
    import ToastContainer from '$lib/components/ToastContainer.svelte';
    import { fly, fade } from 'svelte/transition';
    import { initializeMenuLearning } from '$lib/initMenuLearning';

    onMount(async () => {
      // Check user authentication
      checkUser();
      
      // Initialize menu learning system
      try {
        await initializeMenuLearning();
        console.log('Menu learning system initialized');
      } catch (error: any) {
        console.error('Error initializing menu learning system:', error?.message || String(error));
      }
    });
  
    const logout = async () => {
      try {
        await account.deleteSession('current'); // Log out the current session
        user.set(null); // Set user to null after logging out
        toasts.success('Logged out successfully');
        goto("/logout")
      } catch (error) {
        console.error('Logout failed:', error.message);
        toasts.error('Logout failed: ' + error.message);
      }
    };

    let isMenuOpen = false;
    const toggleMenu = () => isMenuOpen = !isMenuOpen;
    const closeMenu = () => isMenuOpen = false;
</script>

<!-- Add Google Fonts -->
<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <header class="bg-white bg-opacity-90 backdrop-blur-sm shadow-sm fixed top-0 left-0 right-0 z-30">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <a href="/" class="flex items-center space-x-2" aria-label="MenuMap Home">
          <img src="/log35.png" class="h-10 w-10" alt="MenuMap Logo" />
          <span class="text-xl font-bold text-green-600">MenuMap</span>
        </a>
        
        <nav class="hidden md:flex items-center space-x-6">
          {#if $user}
            <a href="/create-quiz" class="text-gray-700 hover:text-green-600 transition-colors">Add menu items</a>
            <a href="/find-quiz" class="text-gray-700 hover:text-green-600 transition-colors">Find menu items</a>
            <a href="/profile" class="text-gray-700 hover:text-green-600 transition-colors">Profile</a>
            <button 
              on:click={logout} 
              class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Logout
            </button>
          {:else}
            <a href="/login" class="text-gray-700 hover:text-green-600 transition-colors">Login</a>
            <a 
              href="/signup" 
              class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Sign Up
            </a>
          {/if}
        </nav>
        
        <!-- Mobile menu button -->
        <button 
          class="md:hidden rounded-full p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          on:click={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-label="Toggle menu"
        >
          <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Mobile menu -->
    {#if isMenuOpen}
      <div 
        transition:fly={{ y: -20, duration: 200 }}
        class="md:hidden bg-white border-t border-gray-100 shadow-lg"
      >
        <div class="container mx-auto px-4 py-3 space-y-1">
          {#if $user}
            <a 
              href="/create-quiz" 
              class="block py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-md"
              on:click={closeMenu}
            >
              Add menu items
            </a>
            <a 
              href="/find-quiz" 
              class="block py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-md"
              on:click={closeMenu}
            >
              Find menu items
            </a>
            <a 
              href="/profile" 
              class="block py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-md"
              on:click={closeMenu}
            >
              Profile
            </a>
            <button 
              on:click={() => { closeMenu(); logout(); }}
              class="w-full text-left py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Logout
            </button>
          {:else}
            <a 
              href="/login" 
              class="block py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-md"
              on:click={closeMenu}
            >
              Login
            </a>
            <a 
              href="/signup" 
              class="block py-2 px-4 text-gray-700 hover:bg-gray-50 rounded-md"
              on:click={closeMenu}
            >
              Sign Up
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </header>

  <main class="flex-grow pt-16">
    <slot />
  </main>

  <footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="text-xl font-bold mb-4">MenuMap</h3>
          <p class="text-gray-300">Discover local menus in one place. Browse and compare menu content from restaurants around you.</p>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li><a href="/" class="text-gray-300 hover:text-white transition-colors">Home</a></li>
            <li><a href="/about" class="text-gray-300 hover:text-white transition-colors">About</a></li>
            <li><a href="/how-to" class="text-gray-300 hover:text-white transition-colors">How It Works</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">Connect With Us</h3>
          <div class="flex space-x-4">
            <a href="#" class="text-gray-300 hover:text-white transition-colors">
              <i class="fab fa-twitter text-xl"></i>
            </a>
            <a href="#" class="text-gray-300 hover:text-white transition-colors">
              <i class="fab fa-facebook text-xl"></i>
            </a>
            <a href="#" class="text-gray-300 hover:text-white transition-colors">
              <i class="fab fa-instagram text-xl"></i>
            </a>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} MenuMap. All rights reserved.</p>
      </div>
    </div>
  </footer>
</div>

<ToastContainer />

<style>
  :global(body) {
    font-family: 'Poppins', sans-serif;
    color: #212121;
  }
  
  :global(h1, h2, h3, h4, h5, h6) {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
  }
</style>
