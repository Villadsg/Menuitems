<script lang="ts">
    import '../app.css'; // Import Tailwind CSS
    import { user, checkUser, logoutUser } from '$lib/userStore';
    import { onMount } from 'svelte';
    import { Navbar, NavBrand, NavHamburger, NavUl, NavLi } from 'flowbite-svelte';
  
    onMount(() => {
      checkUser();
    });
  
    const logout = async () => {
      try {
        await logoutUser();
      } catch (error) {
        console.error('Logout failed:', error.message);
      }
    };
</script>

<Navbar class="bg-transparent fixed top-0 left-0 w-full z-50">
  <NavBrand href="/">
    <img src="/Designer.png" class="me-3 h-6 sm:h-9" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Langtours</span>
  </NavBrand>

  <NavHamburger />

  <NavUl>
    {#if $user}
    <NavLi href="/create-quiz">Create Quiz</NavLi>
      <NavLi href="/profile">Profile</NavLi>
      <NavLi as="button" on:click={logout}>Logout</NavLi>
    {:else}
      <NavLi href="/login">Login</NavLi>
      <NavLi href="/signup">Sign Up</NavLi>
    {/if}
  </NavUl>
</Navbar>

<slot></slot>
