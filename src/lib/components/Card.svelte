<script lang="ts">
  export let padding = 'p-4';
  export let elevation: 'none' | 'sm' | 'md' | 'lg' = 'md';
  export let rounded = true;
  export let hoverable = false;
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
  
  const roundedClass = rounded ? 'rounded-lg' : '';
  const hoverClass = hoverable ? 'transition-all duration-200 hover:shadow-lg' : '';
  
  const classes = `bg-white ${padding} ${shadowClasses[elevation]} ${roundedClass} ${hoverClass}`;
</script>

<div class={classes}>
  <slot></slot>
</div>
