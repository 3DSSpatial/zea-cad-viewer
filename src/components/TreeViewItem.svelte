<script>
  import { afterUpdate, beforeUpdate, onMount } from 'svelte'

  import IconEye from '../components/icons/IconEye.svelte'
  import IconEyeOff from '../components/icons/IconEyeOff.svelte'
  import IconChevronDown from '../components/icons/IconChevronDown.svelte'
  import IconChevronRight from '../components/icons/IconChevronRight.svelte'
  const { CADBody } = window.zeaCad
  const { TreeItem, InstanceItem } = window.zeaEngine

  export let item
  export let selectionManager = null
  export let undoRedoManager = null
  let isExpanded = false
  let highlighted = false
  let visible = false

  let childComponents = []
  let expandPath
  export function expandTree(path) {
    isExpanded = true
    if (childComponents.length > 0) {
      expandSubTree(path)
    } else {
      expandPath = path
    }
  }
  function expandSubTree(path) {
    if (path.length > 1) {
      const childIndex = item.getChildIndex(path[1])
      const treeViewItem = childComponents[childIndex]
      treeViewItem.expandTree(path.slice(1))
    } else {
      // causes the element to be always at the top of the view.
      el.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center',
      })
    }
  }

  let el
  let hasChildren = false
  let highlightBgColor
  let highlightColor
  let isTreeItem
  let unsubChildAdded
  let unsubChildRemoved
  let unsubHighlightChanged
  let unsubVisibilityChanged

  const updateHighlight = () => {
    if (item && 'isHighlighted' in item) {
      highlighted = item.isHighlighted()

      if (highlighted && 'getHighlight' in item) {
        const { Color } = globalThis.zeaEngine

        const itemHighlightColor = item.getHighlight()
        const bgColor = itemHighlightColor.lerp(
          new Color(0.75, 0.75, 0.75, 0),
          0.5
        )

        highlightColor = itemHighlightColor.toHex()
        highlightBgColor = `${bgColor.toHex()}60`
      }
    }
  }

  const toggleIsExpanded = () => {
    isExpanded = !isExpanded
  }

  const updateVisibility = () => {
    if (isTreeItem) {
      visible = item.isVisible()
    }
  }

  const toggleVisibility = () => {
    const visibleParam = item.getParameter('Visible')
    visible = !visibleParam.getValue()

    if (undoRedoManager) {
      const { ParameterValueChange } = globalThis.zeaUx
      const change = new ParameterValueChange(visibleParam, visible)
      undoRedoManager.addChange(change)
      return
    }

    visibleParam.setValue(visible)
  }

  const handleItemClick = (event) => {
    if (!selectionManager) {
      item.setSelected(!item.getSelected())
      return
    }

    if (selectionManager.pickingModeActive()) {
      selectionManager.pick(item)
      return
    }

    selectionManager.toggleItemSelection(item, !event.ctrlKey)
  }

  const forceRender = () => {
    item = item
  }

  const initItem = () => {
    if (!item) {
      return
    }

    if (!globalThis.zeaEngine) {
      throw new Error(
        '`zeaEngine` is missing from the `globalThis` property. This component requires it.'
      )
    }

    // This reference to the element is added so the component can navigate
    // using the keyboard.
    item.elemRef = el

    isTreeItem = item instanceof TreeItem

    updateHighlight()
    updateVisibility()

    if (isTreeItem) {
      if (unsubChildAdded > -1) {
        item.off('childAdded', forceRender)
      }
      unsubChildAdded = item.on('childAdded', forceRender)

      if (unsubChildRemoved > -1) {
        unsubChildRemoved = item.off('childRemoved', forceRender)
      }
      unsubChildRemoved = item.on('childRemoved', forceRender)

      if (unsubVisibilityChanged > -1) {
        item.off('visibilityChanged', updateVisibility)
      }
      unsubVisibilityChanged = item.on('visibilityChanged', updateVisibility)

      // This code is for a special case when items are replaced in the
      // TreeView and we don't load the component again.
      const isBody = item instanceof CADBody
      const isInstancedBody =
        item instanceof InstanceItem && item.getSrcTree() instanceof CADBody
      hasChildren = item.getNumChildren() > 0 && !isBody && !isInstancedBody
    }

    if (unsubHighlightChanged > -1) {
      item.off('highlightChanged', updateHighlight)
    }
    unsubHighlightChanged = item.on('highlightChanged', updateHighlight)
  }

  beforeUpdate(() => {
    initItem()
  })
  afterUpdate(() => {
    if (expandPath) {
      expandSubTree(expandPath)
      expandPath = null
    }
  })
</script>

{#if item}
  <div bind:this={el} class="TreeItem" class:text-gray-500={!visible}>
    <div
      class="TreeItem__header flex items-center cursor-default hover:bg-gray-800 transition-colors mb-1"
    >
      {#if hasChildren}
        <button
          class="cursor-default hover:bg-gray-700 rounded w-8 md:w-6"
          on:click={toggleIsExpanded}
        >
          {#if isExpanded}
            <IconChevronDown />
          {:else}
            <IconChevronRight />
          {/if}
        </button>
      {:else}
        <div class="w-8 md:w-6" />
      {/if}

      {#if isTreeItem}
        <button
          class="cursor-default hover:bg-gray-700 rounded p-1 w-8 md:w-6"
          on:click={toggleVisibility}
        >
          {#if visible}
            <IconEye />
          {:else}
            <IconEyeOff />
          {/if}
        </button>
      {/if}

      <span
        class="flex-1 border rounded px-1"
        style="background-color: {highlighted
          ? highlightBgColor
          : 'transparent'}; border-color: {highlighted
          ? highlightColor
          : 'transparent'};"
        on:click={handleItemClick}
      >
        {item.getName()}
      </span>
    </div>

    {#if hasChildren && isExpanded}
      <div
        class="TreeItem__body ml-4 pl-4 md:ml-3 md:pl-3 border-dotted border-l-2 md:border-l"
      >
        {#if isTreeItem}
          {#each item.getChildren() as childItem, i}
            <svelte:self
              item={childItem}
              {selectionManager}
              {undoRedoManager}
              bind:this={childComponents[i]}
            />
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}
