<script>
  export let isHighlighted = false
  export let title = ''
</script>

<button
  class="ToolbarItem border border-gray-500 shadow cursor-default rounded transform hover:scale-105 transition-all h-10 w-10 p-1 bg-background bg-opacity-40 hover:opacity-100"
  class:ring-4={isHighlighted}
  class:ring-primary={isHighlighted}
  on:click
  {title}
>
  <slot />
</button>
