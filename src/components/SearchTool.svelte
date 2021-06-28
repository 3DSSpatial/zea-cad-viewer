<script>
  import { onMount } from 'svelte'

  import { scene } from '../stores/scene.js'

  const { Color, Material, TreeItem, GeomItem, GridTreeItem } = window.zeaEngine

  let searchInputEl
  let searchResultsEl
  let value = ''

  const filteredItemsSet = new Set()
  const filteredItemMaterial = new Material()
  filteredItemMaterial.setShaderName('FlatSurfaceShader')
  filteredItemMaterial
    .getParameter('BaseColor')
    .setValue(new Color(0, 0, 1, 0.1))

  const filteredItemMaterials = {}
  const matchedItemsSet = new Set()
  const matchColor = new Color(1, 0, 0, 0.2)

  const doSearch = () => {
    if ($scene) {
      while (searchResultsEl.firstChild) {
        searchResultsEl.removeChild(searchResultsEl.lastChild)
      }
      filteredItemsSet.forEach((item) => {
        if (item instanceof GeomItem) {
          // Updating the search.
          // Put back the original materials
          if (filteredItemMaterials[item.getId()]) {
            const materialParam = item.getParameter('Material')
            materialParam.setValue(filteredItemMaterials[item.getId()])
          }
        }
      })
      filteredItemsSet.clear()
      matchedItemsSet.forEach((item) => {
        item.removeHighlight('searchResult', true)
      })
      matchedItemsSet.clear()

      if (value.length >= 2) {
        const re = new RegExp(value, 'i')
        $scene.getRoot().traverse((item) => {
          if (item instanceof GridTreeItem || !(item instanceof TreeItem))
            return false
          if (re.test(item.getName())) {
            const listItem = document.createElement('li')
            listItem.classList.add('truncate')
            listItem.textContent = item.getName()
            searchResultsEl.appendChild(listItem)
            matchedItemsSet.add(item)
            item.addHighlight('searchResult', matchColor, true)
            return false
          } else if (item instanceof GeomItem) {
            filteredItemsSet.add(item)
          }
        })
      }
    }
  }

  $: doSearch(value)

  const handleSubmit = () => {
    // Make all the filtered items transparent so we can see the
    // matched items more clearly.
    filteredItemsSet.forEach((item) => {
      if (item instanceof GeomItem) {
        const materialParam = item.getParameter('Material')
        filteredItemMaterials[item.getId()] = materialParam.getValue()
        materialParam.setValue(filteredItemMaterial)
      }
    })
    matchedItemsSet.forEach((item) => {
      item.removeHighlight('searchResult', true)
    })
  }

  onMount(() => {
    searchInputEl.focus()
  })
</script>

<div class="h-full w-full px-3">
  <form on:submit|preventDefault={handleSubmit}>
    <input
      bind:this={searchInputEl}
      bind:value
      class="rounded w-full text-black px-1"
      type="search"
    />
  </form>
  <ul bind:this={searchResultsEl} class="py-3" id="searchResults" />
</div>
