<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/add-menuitems');
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <p class="text-gray-500">Redirecting...</p>
</div>
