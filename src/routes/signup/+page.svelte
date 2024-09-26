<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { ID } from 'appwrite';
  import { Label, Button } from 'flowbite-svelte';

  let email = '';
  let password = '';
  let confirmPassword = ''; // New variable for confirm password

  const signup = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match. Please try again.');
      return;
    }

    try {
      await account.create(ID.unique(), email, password);
      alert('Signup successful! Please check your email to verify your account.');
    } catch (error) {
      console.error('Signup error:', error.message);
      alert('Signup failed: ' + error.message);
    }
  };
</script>

<form on:submit|preventDefault={signup} class="space-y-4 max-w-md mx-auto pt-40">
  <div>
    <Label for="email">Email</Label>
    <input id="email" type="email" bind:value={email} required class="w-full p-2 border border-gray-300 rounded-lg" />
  </div>
  <div>
    <Label for="password">Password</Label>
    <input id="password" type="password" bind:value={password} required class="w-full p-2 border border-gray-300 rounded-lg" />
  </div>
  <div>
    <Label for="confirm-password">Confirm Password</Label>
    <input id="confirm-password" type="password" bind:value={confirmPassword} required class="w-full p-2 border border-gray-300 rounded-lg" />
  </div>
  <Button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg">Sign Up</Button>
</form>
