<script>
  import ToolbarItem from './ToolbarItem.svelte'

  export let isHighlighted = false
  export let isOpen = false
  export let title = ''

  const handleOutsideClick = () => {
    isOpen = false
    window.removeEventListener('click', handleOutsideClick)
  }

  const handleClick = (event) => {
    event.stopPropagation()

    isOpen = !isOpen

    window.addEventListener('click', handleOutsideClick)
  }
</script>

<button class="ToolbarItemPopup relative">
  <ToolbarItem {isHighlighted} {title} on:click={handleClick}>
    <slot />
  </ToolbarItem>

  <div class:hidden={!isOpen}>
    <slot name="popup" />
  </div>
</button>
