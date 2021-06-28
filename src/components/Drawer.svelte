<script>
  import { ui } from '../stores/ui.js'

  let drawerEl
  let initialCoords
  let initialDrawerSize

  const triggerResize = (event) => {
    const deltaX = initialCoords.clientX - event.clientX

    const newDrawerWidth = initialDrawerSize.width - deltaX

    drawerEl.style.width = `${newDrawerWidth}px`
  }

  const handleMouseMove = (event) => {
    window.getSelection().removeAllRanges()
    triggerResize(event)
  }

  const handleMouseUp = () => {
    document.body.style.cursor = null
    window.removeEventListener('mousemove', handleMouseMove)
  }

  const handleMouseDown = (event) => {
    initialCoords = {
      clientX: event.clientX,
    }

    initialDrawerSize = {
      width: drawerEl.offsetWidth,
    }

    triggerResize(event)

    document.body.style.cursor = 'col-resize'

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }
</script>

<nav
  bind:this={drawerEl}
  class="absolute bg-background flex h-full shadow w-72 top-0 transition transform {$ui.shouldShowDrawer ||
    '-translate-x-full'}"
>
  <div class="DrawerContent flex-1 overflow-hidden">
    <slot />
  </div>

  <div
    class="DrawerHandle flex items-center justify-center text-gray-400 w-2"
    style="cursor: col-resize;"
    on:mousedown={handleMouseDown}
  >
    <span class="material-icons transform rotate-90">drag_handle</span>
  </div>
</nav>
