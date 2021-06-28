<script>
  import { onMount } from 'svelte'

  export let disabled = false
  export let iconLeft = null
  export let iconRight = null
  export let label
  export let shortcut = ''

  let buttonEl

  const shortcutLower = shortcut.toLowerCase()
  const shortcutParts = shortcutLower.split('+')

  const handleWindowKeyDown = (event) => {
    if (event.target instanceof HTMLInputElement) {
      return
    }

    const keys = []

    event.shiftKey && keys.push('shift')
    event.altKey && keys.push('alt')
    event.metaKey && keys.push('ctrl')
    event.ctrlKey && keys.push('ctrl')

    if (
      event.key != 'Alt' &&
      event.key != 'Control' &&
      event.key != 'Ctrl' &&
      event.key != 'Shift'
    ) {
      keys.push(event.key)
    }

    const comboString = keys.join('+').toLowerCase()

    if (comboString === shortcutLower) {
      event.preventDefault()
      buttonEl.dispatchEvent(new MouseEvent('click'))
    }
  }

  onMount(() => {
    if (shortcut) {
      window.addEventListener('keydown', handleWindowKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  })
</script>

<button
  bind:this={buttonEl}
  class="MenuItem cursor-default flex items-center w-full rounded hover:bg-gray-700 justify-between {disabled &&
    'text-gray-500'}"
  {disabled}
  on:click
  on:mouseenter
  on:mouseleave
>
  <span
    class="material-icons md-18 pointer-events-none ml-1 {iconLeft ||
      'text-transparent'}"
  >
    {iconLeft || 'block'}
  </span>

  <span class="flex-1 text-left mr-5 ml-3 pointer-events-none">
    {label}
  </span>

  {#if shortcut}
    {#if shortcutParts.length > 1}
      {#if shortcutParts.includes('shift')}
        <span class="text-xs text-gray-400">⇧</span>
      {/if}

      {#if shortcutParts.includes('ctrl')}
        <span class="text-xs text-gray-400">^</span>
      {/if}

      {#if shortcutParts.includes('alt')}
        <span class="text-xs text-gray-400">⎇</span>
      {/if}
    {/if}

    <span class="text-xs text-gray-400 mr-1">
      {shortcutParts.slice(-1)[0].toUpperCase()}
    </span>
  {/if}

  {#if iconRight}
    <span class="material-icons md-18 pointer-events-none">{iconRight}</span>
  {/if}
</button>
