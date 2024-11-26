<script lang="ts">
  export let distance: number | null = null; // Distance passed for DistanceCheck
  export let onContinue: () => void;
  export let onCancel: () => void;

  export let monumentTooFar: boolean = false; // State to show "too far" message
  export let onCloseTooFar: () => void; // Callback to close the "too far" message
</script>

<!-- Overlay for Distance Check -->
{#if distance !== null && !monumentTooFar}
<div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
  <div class="bg-white p-6 rounded shadow-lg max-w-md w-full text-center">
    <p class="text-xl font-bold mb-4">
      You are {distance.toFixed(2)} kilometers away from the location. Do you want to continue?
    </p>
    <div class="flex justify-around mt-4">
      <button class="bg-blue-500 text-white px-4 py-2 rounded" on:click={onContinue}>Yes</button>
      <button class="bg-red-500 text-white px-4 py-2 rounded" on:click={onCancel}>No</button>
    </div>
  </div>
</div>
{/if}

<!-- Overlay for Monument Too Far -->
{#if monumentTooFar}
<div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
  <div class="bg-white p-6 rounded shadow-lg max-w-md w-full text-center">
    <p class="text-xl font-bold mb-4">
      This location is too far away. You must be within 1000 kilometers to start this quiz.
    </p>
    <div class="flex justify-center mt-4">
      <button class="bg-red-500 text-white px-4 py-2 rounded" on:click={onCloseTooFar}>Close</button>
    </div>
  </div>
</div>
{/if}