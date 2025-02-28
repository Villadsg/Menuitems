<script lang="ts">
  import { loginUser } from '$lib/userStore';
  import { goto } from '$app/navigation';
  import { toasts } from '$lib/stores/toastStore';
  import Input from '$lib/components/Input.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { fly } from 'svelte/transition';

  let email = '';
  let password = '';
  let loading = false;
  let emailError = '';
  let passwordError = '';

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    emailError = '';
    passwordError = '';
    
    // Validate email
    if (!email) {
      emailError = 'Email is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      emailError = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      passwordError = 'Password is required';
      isValid = false;
    }
    
    return isValid;
  };

  const login = async () => {
    if (!validateForm()) return;
    
    try {
      loading = true;
      await loginUser(email, password);
      toasts.success('Login successful!');
      goto('/');
    } catch (error) {
      console.error('Login error:', error.message);
      toasts.error('Login failed: ' + error.message);
    } finally {
      loading = false;
    }
  };
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
  <div in:fly={{ y: 20, duration: 300 }} class="max-w-md w-full">
    <div class="text-center mb-8">
      <a href="/" class="inline-block">
        <img src="/logotime.png" alt="MenuMap Logo" class="h-16 w-16 mx-auto mb-4" />
      </a>
      <h1 class="text-3xl font-bold text-gray-800">Welcome back</h1>
      <p class="text-gray-600 mt-2">Sign in to your account to continue</p>
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-8">
      <form on:submit|preventDefault={login} class="space-y-6">
        <Input 
          id="email" 
          type="email" 
          label="Email Address" 
          value={email} 
          placeholder="your@email.com" 
          required={true}
          error={emailError}
          icon="fas fa-envelope"
          on:input={(e) => email = e.detail}
        />
        
        <Input 
          id="password" 
          type="password" 
          label="Password" 
          value={password} 
          placeholder="••••••••" 
          required={true}
          error={passwordError}
          icon="fas fa-lock"
          on:input={(e) => password = e.detail}
        />
        
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input id="remember-me" type="checkbox" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-700">Remember me</label>
          </div>
          
          <a href="#" class="text-sm font-medium text-green-600 hover:text-green-500">Forgot password?</a>
        </div>
        
        <button 
          type="submit" 
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          disabled={loading}
        >
          {#if loading}
            <Loading size="sm" color="text-white" />
          {:else}
            Sign in
          {/if}
        </button>
      </form>
      
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <i class="fab fa-google text-lg"></i>
          </button>
          <button class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <i class="fab fa-facebook-f text-lg"></i>
          </button>
        </div>
      </div>
    </div>
    
    <p class="text-center mt-6 text-gray-600">
      Don't have an account?
      <a href="/signup" class="font-medium text-green-600 hover:text-green-500">Sign up</a>
    </p>
  </div>
</div>