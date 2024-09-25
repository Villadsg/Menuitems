<script lang="ts">
    import { selectedLanguage } from '$lib/languageStore';
    import { goto } from '$app/navigation';
  
    let language = 'english'; // Default language
  
    const submitLanguage = () => {
      selectedLanguage.set(language); // Set the chosen language in the store
      goto('/TryRoute'); // Redirect to TryRoute
    };
  </script>
  
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
  
    <button on:click={submitLanguage} class="px-4 py-2 bg-blue-500 text-white rounded">
      Continue
    </button>
  </div>
  