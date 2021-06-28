<script>
  import { getContext, onMount } from 'svelte'

  export let disableResize = null
  export let maxSize = Infinity
  export let minSize = 0
  export let size = null

  const isVertical = getContext('__IS_VERTICAL__')
  const isHorizontal = !isVertical

  const cursor = disableResize ? null : `${isVertical ? 'col' : 'row'}-resize`
  const flexDirection = isHorizontal && 'flex-col'
  const iconClass = isVertical && 'transform rotate-90'

  let initialCoords
  let initialParentSize
  let initialSiblingSize
  let parentEl
  let siblingEl
  let restOfSiblings

  const isWithinRange = (size) => size >= minSize && size <= maxSize

  const triggerResize = (event) => {
    if (isVertical) {
      const deltaX = initialCoords.clientX - event.clientX

      const newParentWidth = initialParentSize.width - deltaX

      if (!isWithinRange(newParentWidth)) {
        return
      }

      const newSiblingWidth = initialSiblingSize.width + deltaX

      parentEl.style.width = `${newParentWidth}px`
      siblingEl.style.width = `${newSiblingWidth}px`
    } else {
      const deltaY = initialCoords.clientY - event.clientY

      const newParentHeight = initialParentSize.height - deltaY

      if (!isWithinRange(newParentHeight)) {
        return
      }

      const newSiblingHeight = initialSiblingSize.height + deltaY

      parentEl.style.height = `${newParentHeight}px`
      siblingEl.style.height = `${newSiblingHeight}px`
    }
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
    if (disableResize) {
      return
    }

    const childrenArray = Array.from(parentEl.parentElement.children)

    siblingEl = parentEl.nextElementSibling

    restOfSiblings = childrenArray.filter(
      (el) => el !== parentEl && el !== siblingEl
    )

    initialCoords = {
      clientX: event.clientX,
      clientY: event.clientY,
    }

    initialParentSize = {
      height: parentEl.offsetHeight,
      width: parentEl.offsetWidth,
    }

    initialSiblingSize = {
      height: siblingEl.offsetHeight,
      width: siblingEl.offsetWidth,
    }

    parentEl.classList.remove('flex-1')
    siblingEl.classList.remove('flex-1')

    /* childrenArray.forEach((el) => { */
    /*   el.classList.remove('flex-1') */
    /* }) */

    triggerResize(event)

    document.body.style.cursor = cursor

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  onMount(() => {
    if (size) {
      parentEl.classList.remove('flex-1')
      const dimension = isVertical ? 'width' : 'height'
      parentEl.style[dimension] = `${size}px`
    }
  })
</script>

<div bind:this={parentEl} class="Pane flex flex-1 {flexDirection}">
  <div class="PaneContent flex-1">
    <slot />
  </div>
  <div
    class="PaneHandle bg-gray-300 flex items-center justify-center text-gray-400 {isVertical
      ? 'w-2'
      : 'h-2'}"
    style="cursor: {cursor};"
    on:mousedown={handleMouseDown}
  >
    {#if !disableResize}
      <span class="material-icons {iconClass}">drag_handle</span>
    {/if}
  </div>
</div>
