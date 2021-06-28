<script>
  import { setContext } from 'svelte'

  export let split = 'vertical'

  const isVertical = split == 'vertical'
  const isHorizontal = !isVertical

  setContext('__IS_VERTICAL__', isVertical)

  const flexDirection = isHorizontal && 'flex-col'
</script>

<div class="SplitPane flex h-full {flexDirection}">
  <slot />
</div>

<style>
  .SplitPane :global(.Pane:last-child .PaneHandle) {
    display: none;
  }
</style>
