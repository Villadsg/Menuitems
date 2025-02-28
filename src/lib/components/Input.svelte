<script lang="ts">
  export let id: string;
  export let label: string = '';
  export let type: string = 'text';
  export let value: string = '';
  export let placeholder: string = '';
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let error: string = '';
  export let icon: string = '';
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    dispatch('input', value);
  }
  
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<div class="form-control w-full">
  {#if label}
    <label for={id} class="label">
      <span class="label-text font-medium text-gray-700">{label}</span>
    </label>
  {/if}
  
  <div class="relative">
    {#if icon}
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <i class="{icon} text-gray-500"></i>
      </div>
    {/if}
    
    <input
      {id}
      {type}
      {placeholder}
      {required}
      {disabled}
      class="input input-bordered w-full {icon ? 'pl-10' : ''} {error ? 'input-error' : ''}"
      value={value}
      on:input={handleInput}
      on:blur
      on:focus
    />
  </div>
  
  {#if error}
    <label class="label">
      <span class="label-text-alt text-error">{error}</span>
    </label>
  {/if}
</div>
