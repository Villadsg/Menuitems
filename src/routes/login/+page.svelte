<script lang="ts">
    import { loginUser } from '$lib/userStore';
    import { goto } from '$app/navigation';
    import { Label, Button } from 'flowbite-svelte';
  
    let email = '';
    let password = '';
  
    const login = async () => {
      try {
        await loginUser(email, password);
        goto('/');
      } catch (error) {
        console.error('Login error:', error.message);
        alert('Login failed: ' + error.message);
      }
    };
  </script>
  
  <h2 class="text-2xl font-bold mb-4">Something interesting</h2>
  <form on:submit|preventDefault={login} class="space-y-4 max-w-md mx-auto">
    <div>
      <Label for="email">Email</Label>
      <input id="email" type="email" bind:value={email} required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
    <div>
      <Label for="password">Password</Label>
      <input id="password" type="password" bind:value={password} required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
    <Button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg">Login</Button>
  </form>
  
  <p class="mt-4 text-center">
    Don't have an account? <a href="/signup" class="text-blue-600 hover:underline">Sign Up</a>
  </p>
  