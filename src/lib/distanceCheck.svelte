<script lang="ts">
  export let distance: number;
  export let onContinue: () => void;
  export let onCancel: () => void;
</script>

<div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
  <div class="bg-white p-6 rounded shadow-lg max-w-md w-full text-center">
    <p class="text-xl font-bold mb-4">
      You are {distance.toFixed(2)} kilometers away from the starting point. Do you want to continue?
    </p>
    <div class="flex justify-around mt-4">
      <button class="bg-blue-500 text-white px-4 py-2 rounded" on:click={onContinue}>Yes</button>
      <button class="bg-red-500 text-white px-4 py-2 rounded" on:click={onCancel}>No</button>
    </div>
  </div>
</div>

<style>
  .modal-background {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
</style>
