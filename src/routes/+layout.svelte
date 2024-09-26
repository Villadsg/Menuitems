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

<Navbar class="bg-transparent fixed top-0 left-0">

  <div class="text-center text-white" style="text-shadow: 1px 1px 2px black;">

  <NavBrand href="/">
    <img src="/logotime.png" class="me-1 h-12 w-12" alt="Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Langtours</span>
  </NavBrand>

</div>
  <NavHamburger />



  <NavUl>
    {#if $user}
    <NavLi href="/create-quiz">Create Quiz</NavLi>
      <NavLi href="/profile">Profile</NavLi>
      <NavLi on:click={logout} style="cursor: pointer;">Logout</NavLi>
    {:else}
      <NavLi href="/login">Login</NavLi>
      <NavLi href="/signup">Sign Up</NavLi>
    {/if}
  </NavUl>



</Navbar>


<slot></slot>
