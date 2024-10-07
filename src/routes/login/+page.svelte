<script lang="ts">
  import { loginUser } from '$lib/userStore';
  import { goto } from '$app/navigation';

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

<!-- Add Font Awesome for icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />

<!-- Container to box the form -->
<div class="bg-white shadow-lg rounded-lg p-8 max-w-md mx-auto mt-20 border border-gray-200">
  <form on:submit|preventDefault={login} class="space-y-4">
    <div class="form-control relative">
      <label for="email" class="label">
        <span class="label-text">Email</span>
      </label>
      <i class="fas fa-envelope absolute left-3 top-12 text-gray-500"></i> <!-- Email icon -->
      <input 
        id="email" 
        type="email" 
        bind:value={email} 
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
    
    <button type="submit" class="btn btn-primary w-full">
      Login
    </button>
  </form>

  <p class="mt-4 text-center">
    Don't have an account? <a href="/signup" class="text-blue-600 hover:underline">Sign Up</a>
  </p>
</div>