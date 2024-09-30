<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { ID } from 'appwrite';

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
      goto('/');
    } catch (error) {
      console.error('Signup error:', error.message);
      alert('Signup failed: ' + error.message);
    }
  };
</script>

<form on:submit|preventDefault={signup} class="space-y-4 max-w-md mx-auto pt-40">
  <div class="form-control">
    <label for="email" class="label">
      <span class="label-text">Email</span>
    </label>
    <input 
      id="email" 
      type="email" 
      bind:value={email} 
      required 
      class="input input-bordered w-full" 
    />
  </div>
  
  <div class="form-control">
    <label for="password" class="label">
      <span class="label-text">Password</span>
    </label>
    <input 
      id="password" 
      type="password" 
      bind:value={password} 
      required 
      class="input input-bordered w-full" 
    />
  </div>
  
  <div class="form-control">
    <label for="confirm-password" class="label">
      <span class="label-text">Confirm Password</span>
    </label>
    <input 
      id="confirm-password" 
      type="password" 
      bind:value={confirmPassword} 
      required 
      class="input input-bordered w-full" 
    />
  </div>
  
  <button type="submit" class="btn btn-primary w-full">
    Sign Up
  </button>
</form>

<p class="mt-4 text-center">
  Already have an account? <a href="/login" class="text-blue-600 hover:underline">Login</a>
</p>
