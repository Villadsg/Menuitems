<script lang="ts">
    import { loginUser } from '$lib/userStore';
    import { goto } from '$app/navigation';
  
    let email = '';
    let password = '';
  
    const login = async () => {
      try {
        await loginUser(email, password); // Use the store's login function
        goto('/'); // Redirect to home after login
      } catch (error) {
        console.error('Login error:', error.message);
        alert('Login failed: ' + error.message);
      }
    };
  </script>
  
  <h1>Login</h1>
  <form on:submit|preventDefault={login}>
    <input type="email" bind:value={email} placeholder="Email" required />
    <input type="password" bind:value={password} placeholder="Password" required />
    <button type="submit">Login</button>
  </form>
  
  <p>Don't have an account?</p>
  <a href="/signup">Sign Up</a>
  