import { writable } from 'svelte/store'

const urlParams = new URLSearchParams(window.location.search)
const isEmbedded = urlParams.has('embedded')

const ui = writable({
  currentMenuBarItem: null,
  shouldShowDrawer: !isEmbedded && window.innerWidth >= 768,
  shouldShowParameterOwnerWidget: false,
})

export { ui }
