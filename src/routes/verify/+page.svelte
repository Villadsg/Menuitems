<script lang="ts">
    import { onMount } from 'svelte';
    import { account } from '$lib/appwrite';
    import { goto } from '$app/navigation';
  
    let token = '';
  
    // Function to verify the user
    const verifyUser = async () => {
      try {
        // Verify the user using the token from the URL
        await account.updateVerification(token);
  
        alert('Email verified successfully!');
        goto('/login'); // Redirect to the login page after successful verification
      } catch (error) {
        console.error('Verification failed:', error.message);
        alert('Verification failed: ' + error.message);
      }
    };
  
    // Extract the verification token from the query parameters
    onMount(() => {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token') || '';
  
      if (token) {
        verifyUser();
      } else {
        alert('Invalid verification link');
        goto('/');
      }
    });
  </script>
  
  <h1>Verifying your email...</h1>
  