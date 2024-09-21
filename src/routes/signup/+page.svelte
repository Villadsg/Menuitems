<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { ID } from 'appwrite'; // Import ID helper

  let email = '';
  let password = '';

  const signup = async () => {
    try {
      // Create a new user with a unique ID, email, and password
      const response = await account.create(ID.unique(), email, password);
      console.log('User created:', response);

      // Send verification email to the user
      await account.createVerification('http://localhost:3000/verify');

      alert('Signup successful! Please check your email to verify your account.');
      
      // Optionally, redirect the user to the login page after signup
      goto('/login');
    } catch (error) {
      console.error('Signup error:', error.message);
      alert('Signup failed: ' + error.message);
    }
  };
</script>

<h1>Sign Up</h1>
<form on:submit|preventDefault={signup}>
  <input type="email" bind:value={email} placeholder="Email" required />
  <input type="password" bind:value={password} placeholder="Password" required />
  <button type="submit">Sign Up</button>
</form>
