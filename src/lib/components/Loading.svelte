<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let type: 'spinner' | 'dots' | 'skeleton' = 'spinner';
  export let color: string = 'text-green-500';
  export let fullScreen: boolean = false;
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };
</script>

{#if fullScreen}
  <div class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
    {#if type === 'spinner'}
      <div class={`${sizeClasses[size]} ${color} animate-spin`}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {:else if type === 'dots'}
      <div class="flex space-x-2">
        <div class={`${color} rounded-full animate-bounce`} style="width: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; height: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; animation-delay: 0s;"></div>
        <div class={`${color} rounded-full animate-bounce`} style="width: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; height: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; animation-delay: 0.2s;"></div>
        <div class={`${color} rounded-full animate-bounce`} style="width: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; height: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; animation-delay: 0.4s;"></div>
      </div>
    {:else if type === 'skeleton'}
      <div class="w-64 space-y-4">
        <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div class="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div class="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
      </div>
    {/if}
  </div>
{:else}
  {#if type === 'spinner'}
    <div class={`${sizeClasses[size]} ${color} animate-spin`}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  {:else if type === 'dots'}
    <div class="flex space-x-2">
      <div class={`${color} rounded-full animate-bounce`} style="width: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; height: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; animation-delay: 0s;"></div>
      <div class={`${color} rounded-full animate-bounce`} style="width: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; height: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; animation-delay: 0.2s;"></div>
      <div class={`${color} rounded-full animate-bounce`} style="width: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; height: {size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px'}; animation-delay: 0.4s;"></div>
    </div>
  {:else if type === 'skeleton'}
    <div class="w-full space-y-4">
      <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
      <div class="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
      <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
      <div class="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
    </div>
  {/if}
{/if}
