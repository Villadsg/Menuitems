<script lang="ts">
  import { onMount } from 'svelte';
  import ApiConfig from '$lib/apiConfig';
  import { toasts } from '$lib/stores/toastStore';
  import { goto } from '$app/navigation';

  let serverUrl = '';
  let isMobile = false;
  let isTesting = false;
  let connectionStatus: 'unknown' | 'success' | 'error' = 'unknown';

  onMount(async () => {
    isMobile = ApiConfig.isMobile();
    if (isMobile) {
      const url = await ApiConfig.getServerUrl();
      if (url) {
        serverUrl = url;
      }
    }
  });

  async function saveSettings() {
    if (!serverUrl) {
      toasts.error('Please enter a server URL');
      return;
    }

    try {
      await ApiConfig.setServerUrl(serverUrl);
      toasts.success('Settings saved');
      connectionStatus = 'unknown'; // Reset status until tested
    } catch (error) {
      toasts.error(error.message);
    }
  }

  async function testConnection() {
    if (!serverUrl) {
      toasts.error('Please enter a server URL first');
      return;
    }

    isTesting = true;
    connectionStatus = 'unknown';

    try {
      // Temporarily set the URL to test it (if not saved yet)
      const currentUrl = await ApiConfig.getServerUrl();
      if (currentUrl !== serverUrl) {
        await ApiConfig.setServerUrl(serverUrl);
      }

      const success = await ApiConfig.testConnection();
      if (success) {
        connectionStatus = 'success';
        toasts.success('Connection successful!');
      } else {
        connectionStatus = 'error';
        toasts.error('Could not connect to server');
      }
    } catch (error) {
      connectionStatus = 'error';
      toasts.error('Connection test failed: ' + error.message);
    } finally {
      isTesting = false;
    }
  }

  function goBack() {
    goto('/');
  }
</script>

<div class="min-h-screen bg-gray-50 py-8 px-4">
  <div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
    <div class="p-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
        <button on:click={goBack} class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {#if isMobile}
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2" for="server-url">
            Desktop Server URL
          </label>
          <p class="text-sm text-gray-500 mb-2">
            Enter the IP address and port of your desktop server (e.g., http://192.168.1.5:5173)
          </p>
          <input
            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="server-url"
            type="text"
            placeholder="http://192.168.1.X:5173"
            bind:value={serverUrl}
          />
        </div>

        <div class="flex space-x-4">
          <button
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex-1"
            on:click={saveSettings}
          >
            Save
          </button>
          <button
            class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex-1"
            on:click={testConnection}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {#if connectionStatus === 'success'}
          <div class="mt-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Connected to server successfully
          </div>
        {:else if connectionStatus === 'error'}
          <div class="mt-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            Failed to connect. Check IP and network.
          </div>
        {/if}
      {:else}
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
          <p class="text-blue-700">
            You are running on the web. No server configuration is needed as the API is hosted on the same origin.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>
