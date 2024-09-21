
<script lang="ts">
  import { account } from '$lib/appwrite';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let user = null;

  onMount(async () => {
    try {
      const response = await account.get();
      user = response;
    } catch (error) {
      console.error('User not authenticated:', error.message);
      goto('/login'); // Redirect to login if not authenticated
    }
  });

  const logout = async () => {
    try {
      await account.deleteSession('current');
      goto('/login');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };
</script>

{#if user}
  <h1>Welcome, {user.name}!</h1>
  <button on:click={logout}>Logout</button>
{:else}
  <p>Loading user information...</p>
{/if}
