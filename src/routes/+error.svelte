<script>
  import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="text-center">
    <h1 class="text-9xl font-bold text-green-500 mb-4">{$page.status}</h1>
    
    <p class="text-2xl font-semibold text-gray-700 mb-6">
      {#if $page.status === 404}
        Page Not Found
      {:else}
        {$page.error?.message || 'Something went wrong'}
      {/if}
    </p>
    
    <p class="text-gray-500 mb-8 max-w-md mx-auto">
      {#if $page.status === 404}
        The page you're looking for doesn't exist or has been moved.
      {:else}
        We're sorry, but something went wrong. Please try again later.
      {/if}
    </p>
    
    <div class="flex flex-col sm:flex-row justify-center gap-4">
      <a 
        href="/" 
        class="bg-green-500 hover:bg-green-600 text-white py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center"
      >
        <i class="fas fa-home mr-2"></i> Go Home
      </a>
      
      <button 
        onclick="history.back()" 
        class="border border-gray-300 hover:bg-gray-100 text-gray-700 py-3 px-8 rounded-lg transition-colors inline-flex items-center justify-center"
      >
        <i class="fas fa-arrow-left mr-2"></i> Go Back
      </button>
    </div>
  </div>
</div>
