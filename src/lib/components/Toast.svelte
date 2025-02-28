<script lang="ts">
  import { fly } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  
  export let type: 'success' | 'error' | 'warning' | 'info' = 'info';
  export let message: string;
  export let duration: number = 3000;
  export let showClose: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  
  const typeIcons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  let timeout: ReturnType<typeof setTimeout>;
  
  function close() {
    clearTimeout(timeout);
    dispatch('close');
  }
  
  function setupAutoClose() {
    if (duration > 0) {
      timeout = setTimeout(close, duration);
    }
  }
  
  $: if (message) setupAutoClose();
</script>

<div
  class="fixed bottom-4 right-4 z-50 max-w-md"
  transition:fly={{ y: 50, duration: 300 }}
  on:mouseenter={() => clearTimeout(timeout)}
  on:mouseleave={setupAutoClose}
>
  <div class="flex items-center p-4 rounded-lg shadow-lg {typeClasses[type]} text-white">
    <i class="{typeIcons[type]} mr-3"></i>
    <div class="flex-1">{message}</div>
    {#if showClose}
      <button
        class="ml-4 text-white hover:text-gray-200 focus:outline-none"
        on:click={close}
        aria-label="Close notification"
      >
        <i class="fas fa-times"></i>
      </button>
    {/if}
  </div>
</div>
