<script lang="ts">
    import '../app.css'; // Import Tailwind CSS
    import { user, checkUser, logoutUser } from '$lib/userStore';
    import { onMount } from 'svelte';
    import { Navbar, NavBrand, NavHamburger, NavUl, NavLi } from 'flowbite-svelte';
    import { account } from '$lib/appwrite';
	  import { goto } from '$app/navigation';
   

    onMount(() => {
      checkUser();
    });
  
    const logout = async () => {
      try {
        await account.deleteSession('current'); // Log out the current session
        user.set(null); // Set user to null after logging out
        goto("/logout")
      } catch (error) {
        console.error('Logout failed:', error.message);
        alert('Logout failed: ' + error.message);
      }
    };
</script>




<div class="bg-transparent navbar  fixed top-0 left-0 ">
  <div class="flex-1 text-center text-white" style="text-shadow: 1px 1px 2px black;">
    <a href="/" class="btn btn-ghost normal-case text-xl flex items-center">
      <img src="/logotime.png" class="h-12 w-12" alt="Logo" />
      <span class="ml-2 font-semibold">Langtours</span>
    </a>
  </div>
  <div class="flex-none">
    <div class="dropdown dropdown-end">
      <button class="btn btn-ghost btn-circle" aria-label="Menu">
        <!-- Hamburger Icon -->
        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <ul class="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52">
        {#if $user}
          <li><a href="/create-quiz">Create Quiz</a></li>
          <li><a href="/profile">Profile</a></li>
          <li><button on:click={logout} style="cursor: pointer;">Logout</button></li>
        {:else}
          <li><a href="/login">Login</a></li>
          <li><a href="/signup">Sign Up</a></li>
        {/if}
      </ul>
    </div>
  </div>
</div>





<slot></slot>

