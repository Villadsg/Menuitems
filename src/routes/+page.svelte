
<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';

  const login = async () => {
    try {
      // Use createEmailSession to log in with email and password
      await account.createEmailPasswordSession(email, password);
      goto('/dashboard'); // Redirect after successful login
    } catch (error) {
      console.error('Login error:', error.message);
      alert('Login failed: ' + error.message);
    }
  };

  const navigateToSignup = () => {
    goto('/signup'); // Redirect to signup page
  };
</script>

<h1>Login</h1>
<form on:submit|preventDefault={login}>
  <input type="email" bind:value={email} placeholder="Email" required />
  <input type="password" bind:value={password} placeholder="Password" required />
  <button type="submit">Login</button>
</form>

<p>Don't have an account?</p>
<button on:click={navigateToSignup}>Sign Up</button>
