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

<form on:submit|preventDefault={login} class="space-y-4 max-w-md mx-auto pt-40">
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
  
  <button type="submit" class="btn btn-primary w-full">
    Login
  </button>
</form>

<p class="mt-4 text-center">
  Don't have an account? <a href="/signup" class="text-blue-600 hover:underline">Sign Up</a>
</p>
