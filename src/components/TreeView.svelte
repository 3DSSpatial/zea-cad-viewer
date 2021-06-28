<script>
  import { beforeUpdate } from 'svelte'
  import TreeViewItem from './TreeViewItem.svelte'

  let treeEl
  export let rootTreeItems
  export let selectionManager = null
  export let undoRedoManager = null
  export let isMouseOver = null
  let childComponents = []

  export let onKeyDownRegistered = false
  export let selectionChangedRegistered = false

  const onKeyDown = (event) => {
    if (!isMouseOver) return

    if (!selectionManager) return
    // if (event.key == 'f') {
    //   const selectedItems = selectionManager.getSelection()
    //   expandSelection(selectedItems, true)
    //   event.preventDefault()
    //   event.stopPropagation()
    //   return
    // }

    if (event.key == 'ArrowLeft') {
      const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        if (!rootTreeItems.includes(item)) newSelection.add(item.getOwner())
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key == 'ArrowRight') {
      const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        if (
          item instanceof window.zeaEngine.TreeItem &&
          item.getNumChildren() > 0 &&
          !(item instanceof window.zeaCad.CADBody)
        )
          newSelection.add(item.getChild(0))
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
        // expandSelection(newSelection, true)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key == 'ArrowUp') {
      const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        const index = item.getOwner().getChildIndex(item)
        if (index == 0) newSelection.add(item.getOwner())
        else {
          newSelection.add(item.getOwner().getChild(index - 1))
        }
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
        // expandSelection(newSelection)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key == 'ArrowDown') {
      const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        const index = item.getOwner().getChildIndex(item)
        if (index < item.getOwner().getNumChildren() - 1)
          newSelection.add(item.getOwner().getChild(index + 1))
        else {
          const indexinOwner = item.getOwner().getChildIndex(item)
          if (item.getOwner().getNumChildren() > indexinOwner + 1)
            newSelection.add(item.getOwner().getChild(indexinOwner + 1))
        }
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
        // expandSelection(newSelection, true)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }
  }

  if (!onKeyDownRegistered) {
    document.addEventListener('keydown', onKeyDown)
    onKeyDownRegistered = true
  }

  beforeUpdate(() => {
    if (selectionManager && !selectionChangedRegistered) {
      selectionManager.on('leadSelectionChanged', () => {
        const selectedItems = selectionManager.getSelection()
        expandSelection(selectedItems, true)
      })
      selectionChangedRegistered = true
    }
  })

  /**
   * The expandSelection method.
   * @param {Set} selectedItems - The items we wish to expand to show.
   */
  const expandSelection = (selectedItems, scrollToView = true) => {
    Array.from(selectedItems).forEach((selectedItem) => {
      const path = []
      while (true) {
        path.splice(0, 0, selectedItem)
        if (rootTreeItems.includes(selectedItem)) break
        selectedItem = selectedItem.getOwner()
      }
      rootTreeItems.forEach((rootTreeItem, index) => {
        if (rootTreeItem != path[0]) return
        const treeViewItem = childComponents[index]
        treeViewItem.expandTree(path, scrollToView)
      })
    })
  }
</script>

<div bind:this={treeEl} class="TreeView min-w-max noselect">
  {#each rootTreeItems as item, i}
    <TreeViewItem
      {item}
      {selectionManager}
      {undoRedoManager}
      bind:this={childComponents[i]}
    />
  {/each}
</div>
