<script context="module">
  import { ui } from '../stores/ui.js'

  const closeAll = () => {
    ui.update((val) => ({
      ...val,
      currentMenuBarItem: null,
    }))
  }

  window.addEventListener('click', (event) => {
    if (!event.target.parentElement) return
    const aMenuItemDropDownIsTarget = event.target.parentElement.classList.contains(
      'MenuItemDropDown'
    )

    const aMenuBarItemIsTarget = event.target.parentElement.classList.contains(
      'MenuBarItem'
    )

    if (aMenuItemDropDownIsTarget || aMenuBarItemIsTarget) {
      return
    }

    closeAll()
  })

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAll()
    }
  })
</script>

<script>
  export let label

  $: isOpen = $ui.currentMenuBarItem === menuBarItemEl

  let buttonEl
  let menuBarItemEl

  const handleClick = () => {
    if (isOpen) {
      $ui.currentMenuBarItem = null
      return
    }

    $ui.currentMenuBarItem = menuBarItemEl
  }

  const handleMouseEnter = () => {
    if ($ui.currentMenuBarItem) {
      $ui.currentMenuBarItem = menuBarItemEl
      buttonEl.focus()
    }
  }
</script>

<div bind:this={menuBarItemEl} class="MenuBarItem">
  <button
    bind:this={buttonEl}
    class="cursor-default h-full px-3 hover:bg-gray-700 transition-colors rounded"
    on:click={handleClick}
    on:mouseenter={handleMouseEnter}
  >
    {label}
  </button>

  <slot {isOpen} />
</div>
