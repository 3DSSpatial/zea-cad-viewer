<script>
  import { afterUpdate, beforeUpdate, onMount } from 'svelte'

  import IconEye from '../components/icons/IconEye.svelte'
  import IconEyeOff from '../components/icons/IconEyeOff.svelte'
  import IconChevronDown from '../components/icons/IconChevronDown.svelte'
  import IconChevronRight from '../components/icons/IconChevronRight.svelte'

  import { TreeItem, InstanceItem, Color } from '@zeainc/zea-engine'
  import { CADAssembly, CADPart } from '@zeainc/zea-cad'
  import { ParameterValueChange } from '@zeainc/zea-ux'

  export let item
  export let selectionManager = null
  export let undoRedoManager = null

  const isInstanceItem = (treeItem) => {
    return (
      treeItem instanceof InstanceItem &&
      treeItem.getNumChildren() == 1 &&
      (treeItem.getChild(0) instanceof CADAssembly || treeItem.getChild(0) instanceof CADPart)
    )
  }

  let isExpanded = false
  let highlighted = false
  let visible = false

  let childComponents = []
  let expandPath
  export function expandTree(path) {
    if (path[path.length - 1] == item) {
      // causes the element to be always at the top of the view.
      el.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center',
      })
      return
    }
    isExpanded = true
    if (childComponents.length > 0) {
      expandSubTree(path)
    } else {
      expandPath = path
    }
  }
  function expandSubTree(path) {
    if (path.length > 1) {
      let childIndex = -1
      let subPath
      if (isInstanceItem(item)) {
        childIndex = item.getChild(0).getChildIndex(path[2])
        subPath = path.slice(2)
      } else {
        childIndex = item.getChildIndex(path[1])
        subPath = path.slice(1)
      }
      // const  childIndex = item.getChildIndex(path[1])
      if (childIndex != -1) {
        const treeViewItem = childComponents[childIndex]
        if (treeViewItem) {
          treeViewItem.expandTree(subPath)
        }
      }
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

  const getItemNameAndTooltip = (treeItem) => {
    let name
    const displayNameParam = treeItem.getParameter('DisplayName')
    if (displayNameParam) {
      name = displayNameParam.getValue()
    } else name = treeItem.getName()

    if (isInstanceItem(treeItem)) {
      const referenceItem = treeItem.getChild(0)
      if (name == '') {
        const displayNameParam = referenceItem.getParameter('DisplayName')
        if (displayNameParam) {
          name = displayNameParam.getValue()
        } else name = referenceItem.getName()
      }

      return {
        name: name + ` (Instance of ${referenceItem.getClassName()})`,
        tooltip: `(Instance of ${referenceItem.getClassName()})`,
      }
    } else {
      return {
        name: name + ` (${treeItem.getClassName()})`,
        tooltip: `(${treeItem.getClassName()})`,
      }
    }
  }
  const getChildren = (treeItem) => {
    if (treeItem instanceof InstanceItem && treeItem.getNumChildren() == 1) {
      const referenceItem = treeItem.getChild(0)
      return referenceItem.getChildren()
    } else {
      return treeItem.getChildren()
    }
  }

  const updateHighlight = () => {
    if (item && 'isHighlighted' in item) {
      highlighted = item.isHighlighted()

      if (highlighted && 'getHighlight' in item) {
        const itemHighlightColor = item.getHighlight()
        const bgColor = itemHighlightColor.lerp(new Color(0.75, 0.75, 0.75, 0), 0.5)

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

    const selection = selectionManager.getSelection()
    item.setSelected(selection.has(item))
  }

  const forceRender = () => {
    item = item
  }

  const initItem = () => {
    if (!item) {
      return
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

      hasChildren = item.getNumChildren() > 0
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
    <div class="TreeItem__header flex items-center cursor-default hover:bg-gray-800 transition-colors mb-1">
      {#if hasChildren}
        <button class="cursor-default hover:bg-gray-700 rounded w-8 md:w-6" on:click={toggleIsExpanded}>
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
        <button class="cursor-default hover:bg-gray-700 rounded p-1 w-8 md:w-6" on:click={toggleVisibility}>
          {#if visible}
            <IconEye />
          {:else}
            <IconEyeOff />
          {/if}
        </button>
      {/if}

      <span
        class="flex-1 border rounded px-1"
        style="background-color: {highlighted ? highlightBgColor : 'transparent'}; border-color: {highlighted
          ? highlightColor
          : 'transparent'};"
        on:click={handleItemClick}
      >
        {getItemNameAndTooltip(item).name}
      </span>
    </div>

    {#if hasChildren && isExpanded}
      <div class="TreeItem__body ml-4 pl-4 md:ml-3 md:pl-3 border-dotted border-l-2 md:border-l">
        {#if isTreeItem}
          {#each getChildren(item) as childItem, i}
            <svelte:self item={childItem} {selectionManager} {undoRedoManager} bind:this={childComponents[i]} />
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}
