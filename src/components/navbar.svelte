
<script>
    import { account } from '$lib/appwrite.js';
    import { user } from '../stores/user.js';
    import { goto } from '$app/navigation';
  
    const logout = async () => {
      try {
        await account.deleteSession('current');
        user.set(null);
        goto('/login');
      } catch (error) {
        console.error(error);
      }
    };
  </script>
  
  {#if $user}
    <button on:click={logout}>Log Out</button>
  {/if}
  