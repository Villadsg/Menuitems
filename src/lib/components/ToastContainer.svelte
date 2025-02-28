<script lang="ts">
  import { toasts } from '$lib/stores/toastStore';
  import Toast from './Toast.svelte';
</script>

<div class="fixed bottom-0 right-0 p-4 z-50 space-y-2">
  {#each $toasts as toast (toast.id)}
    <Toast 
      type={toast.type} 
      message={toast.message} 
      duration={toast.duration || 3000}
      on:close={() => toasts.remove(toast.id)}
    />
  {/each}
</div>
