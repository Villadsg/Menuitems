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
  <h1>Home</h1>
  <p>This page works as follows: you create a route, and you earn money.</p>
{/if}

<!-- If the user is logged in, show a welcome message -->
{#if user}
  <h1>Welcome, {user.name}!</h1>
   <!-- Monument Finder component for logged-in users -->
   <MonumentFinder />
{/if}
