<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'outline' | 'text' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let fullWidth = false;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let href: string | null = null;
  
  const variantClasses = {
    primary: 'bg-green-500 hover:bg-green-600 text-white',
    secondary: 'bg-orange-500 hover:bg-orange-600 text-white',
    outline: 'bg-transparent border border-green-500 text-green-500 hover:bg-green-50',
    text: 'bg-transparent text-green-500 hover:underline'
  };
  
  const sizeClasses = {
    sm: 'text-sm py-1 px-3',
    md: 'py-2 px-4',
    lg: 'text-lg py-3 px-6'
  };
  
  const baseClasses = 'rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:outline-none';
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass}`;
</script>

{#if href}
  <a {href} class={classes} role="button" aria-disabled={disabled}>
    <slot></slot>
  </a>
{:else}
  <button {type} class={classes} {disabled} on:click>
    <slot></slot>
  </button>
{/if}
