<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { ID } from 'appwrite';

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';

  const signup = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match. Please try again.');
      return;
    }

    try {
      await account.create(ID.unique(), email, password, username);
      alert('Signup successful! Now you can login)');
      goto('/');
    } catch (error) {
      console.error('Signup error:', error.message);
      alert('Signup failed: ' + error.message);
    }
  };
</script>

<!-- Add Font Awesome for icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />

<div class="bg-white shadow-lg rounded-lg p-12 max-w-md mx-auto mt-20 border border-gray-200">
<form on:submit|preventDefault={signup} class="space-y-4">
  <div class="form-control relative">
    <label for="email" class="label">
      <span class="label-text">Email</span>
    </label>
    <i class="fas fa-envelope absolute left-3 top-12 text-gray-500"></i> 
    <input 
      id="email" 
      type="email" 
      bind:value={email} 
      required 
      class="input input-bordered w-full pl-10" 
    />
  </div>
  <div class="form-control relative">
    <label for="username" class="label">
      <span class="label-text">Username</span>
    </label>
    <i class="fas fa-user absolute left-3 top-12 text-gray-500"></i> <!-- Username icon -->
    <input 
      id="username" 
      type="text" 
      bind:value={username} 
      required 
      class="input input-bordered w-full pl-10"  
    />
  </div>
  <div class="form-control relative">
    <label for="password" class="label">
      <span class="label-text">Password</span>
    </label>
    <i class="fas fa-lock absolute left-3 top-12 text-gray-500"></i> <!-- Password lock icon -->
    <input 
      id="password" 
      type="password" 
      bind:value={password} 
      required 
      class="input input-bordered w-full pl-10"  
    />
  </div>
  
  <div class="form-control relative">
    <label for="confirm-password" class="label">
      <span class="label-text">Confirm Password</span>
    </label>
    <i class="fas fa-lock absolute left-3 top-12 text-gray-500"></i> <!-- Confirm password lock icon -->
    <input 
      id="confirm-password" 
      type="password" 
      bind:value={confirmPassword} 
      required 
      class="input input-bordered w-full pl-10"  
    />
  </div>
  
  <button type="submit" class="btn btn-primary w-full">
    Sign Up
  </button>
</form>

<p class="mt-4 text-center">
  Already have an account? <a href="/login" class="text-blue-600 hover:underline">Login</a>
</p>
</div>