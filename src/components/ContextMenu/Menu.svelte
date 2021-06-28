<script>
  import { setContext, createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'
  import { menuKey } from './menuKey.js'

  export let x
  export let y

  // whenever x and y is changed, restrict box to be within bounds
  $: (() => {
    if (!menuEl) return

    const rect = menuEl.getBoundingClientRect()
    x = Math.min(window.innerWidth - rect.width, x)
    if (y > window.innerHeight - rect.height) y -= rect.height
  })(x, y)

  const dispatch = createEventDispatcher()

  setContext(menuKey, {
    dispatchClick: () => dispatch('click'),
  })

  let menuEl
  const onPageClick = (e) => {
    if (e.target === menuEl || menuEl.contains(e.target)) return
    dispatch('clickoutside')
  }
</script>

<svelte:body on:click={onPageClick} />

<div
  bind:this={menuEl}
  class="Menu"
  style="top: {y}px; left: {x}px;"
  transition:fade={{ duration: 100 }}
>
  <slot />
</div>

<style>
  div {
    position: absolute;
    display: grid;
    border: 1px solid #0003;
    box-shadow: 2px 2px 5px 0px #0002;
    background: var(--color-background-1);

    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>
