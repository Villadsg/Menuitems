<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { ID } from 'appwrite';

  let email = '';
  let password = '';

  const signup = async () => {
    try {
      const response = await account.create(ID.unique(), email, password); // Create user
      alert('Signup successful! Please check your email to verify your account.'); // Inline message
    } catch (error) {
      console.error('Signup error:', error.message);
      alert('Signup failed: ' + error.message); // Inline error message
    }
  };
</script>

<h1>Sign Up</h1>
<form on:submit|preventDefault={signup}>
  <input type="email" bind:value={email} placeholder="Email" required />
  <input type="password" bind:value={password} placeholder="Password" required />
  <button type="submit">Sign Up</button>
</form>
