<script lang="ts">
  import { account } from '$lib/appwrite';
  import MonumentFinder from '$lib/MonumentFinder.svelte';

  let email = '';
  let password = '';
  let user = null;

  // Check if user is already logged in but do not redirect
  const checkUser = async () => {
    try {
      user = await account.get();
    } catch (error) {
      console.log('Not logged in');
    }
  };

  checkUser();

  const login = async () => {
    try {
      await account.createEmailPasswordSession(email, password);
      checkUser(); // Refresh the user state
    } catch (error) {
      console.error('Login error:', error.message);
      alert('Login failed: ' + error.message);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      user = null; // Reset user state after logging out
    } catch (error) {
      console.error('Logout failed:', error.message);
      alert('Logout failed: ' + error.message);
    }
  };
</script>


<!-- Home page content -->
{#if !user}

  <!-- Background image section using Tailwind CSS -->
<div class="bg-cover bg-center bg-no-repeat h-screen" style="background-image: url('/back.jpeg')">
  <div class="flex items-center justify-center h-full bg-black bg-opacity-50">
    <div class="text-center text-white p-4">
      <h1 class="text-4xl font-bold">Complete tours and learn a language</h1>
      <p class="mt-4">And gain points and vouchers for local shops </p>
      <p class="mt-4">Create routes and become a tour designer </p>
      <a href="/TryRoute">
        <button class="mt-8 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Try a route
        </button>
      </a>
    </div>
  </div>
</div>


{/if}

<!-- If the user is logged in, show a welcome message -->
{#if user}

   <MonumentFinder />
{/if}
