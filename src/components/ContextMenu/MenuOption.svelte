<script>
  import { getContext } from 'svelte'
  import { menuKey } from './menuKey.js'

  export let text = ''

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  const { dispatchClick } = getContext(menuKey)

  const handleClick = (e) => {
    dispatch('click')
    dispatchClick()
  }
</script>

<div class="MenuOption text-gray" on:click={handleClick}>
  {#if text}
    {text}
  {:else}
    <slot />
  {/if}
</div>

<style>
  div {
    background-color: var(--color-background-1);
    padding: 4px 15px;
    cursor: default;
    font-size: 14px;
    display: flex;
    align-items: center;
    grid-gap: 5px;
  }
  div:hover {
    background-color: var(--color-background-2);
  }
</style>
