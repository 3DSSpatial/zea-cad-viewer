<script>
  import { createEventDispatcher } from 'svelte'

  import MenuItem from './MenuItem.svelte'

  export let disabled = false
  export let label
  export let shortcut = ''
  export let checked = false

  const dispatch = createEventDispatcher()

  const handleClick = () => {
    checked = !checked

    dispatch('change')
  }
</script>

<MenuItem
  {disabled}
  iconLeft={checked ? 'check' : ''}
  {label}
  {shortcut}
  on:click={handleClick}
/>
