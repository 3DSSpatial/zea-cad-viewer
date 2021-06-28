<script>
  export let isOpen = false

  $: isClosed = !isOpen
</script>

<div
  class="Menu absolute border border-gray-500 bg-background flex-col rounded p-2 shadow w-max"
  class:flex={isOpen}
  class:hidden={isClosed}
  on:mouseenter
>
  <slot />
</div>
