<script lang="ts">
    import { user, checkUser, logoutUser } from '$lib/userStore';
    import { onMount } from 'svelte';
  
    // On component mount, check if the user is logged in
    onMount(() => {
      checkUser();
    });
  
    const logout = async () => {
      try {
        await logoutUser(); // Use the store logout function
      } catch (error) {
        console.error('Logout failed:', error.message);
      }
    };
  </script>
  
  <!-- Navbar for logged-in users -->
  {#if $user}
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/profile">Profile</a></li>
        <li><a href="/create-quiz">Create Quiz</a></li>
        <li><button on:click={logout}>Logout</button></li>
      </ul>
    </nav>
  {/if}
  
  <!-- Navbar for non-logged-in users -->
  {#if !$user}
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/login">Login</a></li>
      </ul>
    </nav>
  {/if}
  
  <slot></slot> <!-- This will render the content of each page -->
  