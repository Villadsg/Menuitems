<script lang="ts">
  import { account } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { ID } from 'appwrite';
  import { toasts } from '$lib/stores/toastStore';
  import Input from '$lib/components/Input.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { fly } from 'svelte/transition';

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  
  let usernameError = '';
  let emailError = '';
  let passwordError = '';
  let confirmPasswordError = '';

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    usernameError = '';
    emailError = '';
    passwordError = '';
    confirmPasswordError = '';
    
    // Validate username
    if (!username) {
      usernameError = 'Username is required';
      isValid = false;
    }
    
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
    } else if (password.length < 8) {
      passwordError = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      confirmPasswordError = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      confirmPasswordError = 'Passwords do not match';
      isValid = false;
    }
    
    return isValid;
  };

  const signup = async () => {
    if (!validateForm()) return;
    
    try {
      loading = true;
      await account.create(ID.unique(), email, password, username);
      toasts.success('Account created successfully!');
      goto('/login');
    } catch (error) {
      console.error('Signup error:', error.message);
      toasts.error('Signup failed: ' + error.message);
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
      <h1 class="text-3xl font-bold text-gray-800">Create an account</h1>
      <p class="text-gray-600 mt-2">Sign up to get started with LangTours</p>
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-8">
      <form on:submit|preventDefault={signup} class="space-y-6">
        <Input 
          id="username" 
          type="text" 
          label="Username" 
          value={username} 
          placeholder="johndoe" 
          required={true}
          error={usernameError}
          icon="fas fa-user"
          on:input={(e) => username = e.detail}
        />
        
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
        
        <Input 
          id="confirm-password" 
          type="password" 
          label="Confirm Password" 
          value={confirmPassword} 
          placeholder="••••••••" 
          required={true}
          error={confirmPasswordError}
          icon="fas fa-lock"
          on:input={(e) => confirmPassword = e.detail}
        />
        
        <button 
          type="submit" 
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          disabled={loading}
        >
          {#if loading}
            <Loading size="sm" color="text-white" />
          {:else}
            Sign up
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
      Already have an account?
      <a href="/login" class="font-medium text-green-600 hover:text-green-500">Sign in</a>
    </p>
  </div>
</div>