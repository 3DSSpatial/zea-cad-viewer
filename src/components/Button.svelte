<script>
  export let disabled = false
  export let fullWidth = false
  export let variant = 'default'
</script>

<button
  class="Button cursor-default rounded text-gray-800 px-3 py-1 transition-colors bg-{variant ===
  'default'
    ? 'primary'
    : 'secondary'} hover:bg-{variant === 'default'
    ? 'primary'
    : 'secondary'}-light {fullWidth && 'w-full'}"
  {disabled}
  on:click
>
  <slot />
</button>
