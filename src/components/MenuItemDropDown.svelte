<script>
  import { onMount, tick } from 'svelte'

  import MenuItem from './MenuItem.svelte'

  export let label

  let childMenuEl
  let enterTimeoutID
  let isOpen = false
  let leaveTimeoutID
  let rootEl

  const open = () => {
    childMenuEl.style.left = `${rootEl.offsetWidth}px`

    isOpen = true
  }

  const handleMouseEnter = () => {
    enterTimeoutID = window.setTimeout(() => {
      open()
    }, 200)
  }

  const handleClick = () => {
    if (isOpen) {
      isOpen = false
      return
    }

    open()
  }

  const handleMouseLeave = () => {
    window.clearTimeout(enterTimeoutID)

    leaveTimeoutID = window.setTimeout(() => {
      isOpen = false
    }, 50)
  }

  const handleChildMenuElMouseEnter = () => {
    window.clearTimeout(leaveTimeoutID)
  }

  onMount(() => {
    childMenuEl = rootEl.querySelector('.Menu')
    childMenuEl.style.top = 0
    childMenuEl.addEventListener('mouseenter', handleChildMenuElMouseEnter)

    return () => {
      childMenuEl.removeEventListener('mouseenter', handleChildMenuElMouseEnter)
    }
  })
</script>

<div bind:this={rootEl} class="MenuItemDropDown relative">
  <MenuItem
    iconRight="chevron_right"
    {label}
    on:click={handleClick}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
  />

  <slot {isOpen} />
</div>
