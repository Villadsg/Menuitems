<script lang="ts">
  import { selectedLanguage } from '$lib/languageStore';
  import { goto } from '$app/navigation';

  let language = 'english'; // Default language
  let latitude = null;
  let longitude = null;
  let locationError = '';
  let isLoading = false;  // State to manage loading

  const submitLanguage = () => {
    isLoading = true;  // Set loading state

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;

          // Set the chosen language in the store
          selectedLanguage.set(language);

          // Redirect to TryRoute page with language and location
          goto(`/TryRoute?lat=${latitude}&lng=${longitude}&lang=${language}`);
        },
        (error) => {
          locationError = 'Could not retrieve your location';
          console.error(error.message);
          isLoading = false;  // Stop loading on error
        }
      );
    } else {
      locationError = 'Geolocation is not supported by your browser.';
      isLoading = false;  // Stop loading if geolocation isn't supported
    }
  };
</script>

<div class="flex items-start justify-center h-full bg-opacity-50 pt-40">
  <div class="max-w-xl mx-auto p-8">
    <h1 class="text-2xl font-bold mb-4">Which language are you learning?</h1>

    <div class="mb-4">
      <label for="language" class="font-bold">Select Language:</label>
      <select id="language" bind:value={language} class="p-2 border rounded w-full">
        <option value="english">English</option>
        <option value="spanish">Spanish</option>
        <option value="italian">Italian</option>
        <option value="japanese">Japanese</option>
        <option value="danish">Danish</option>
      </select>
    </div>

    {#if locationError}
      <p class="text-red-500">{locationError}</p>
    {/if}

    <style>
      .custom-spinner {
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        width: 1rem;
        height: 1rem;
        animation: spin 1s linear infinite;
      }
    
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
    
    <button on:click={submitLanguage} class="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded w-full" disabled={isLoading}>
      {#if isLoading}
        <div class="custom-spinner mr-2"></div>
        Loading...
      {:else}
        Continue
      {/if}
    </button>
    
  </div>
</div>
