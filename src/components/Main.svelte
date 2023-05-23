<script>
  import { onMount } from 'svelte'

  import '../helpers/fps-display'

  import Menu from '../components/ContextMenu/Menu.svelte'
  import MenuOption from '../components/ContextMenu/MenuOption.svelte'
  import Dialog from '../components/Dialog.svelte'
  import ParameterOwnerWidget from './parameters/ParameterOwnerWidget.svelte'
  import Toolbar from '../components/Toolbar/Toolbar.svelte'

  import Drawer from '../components/Drawer.svelte'
  import ProgressBar from '../components/ProgressBar.svelte'
  import Sidebar from '../components/Sidebar.svelte'
  import DropZone from '../components/DropZone.svelte'

  import { APP_DATA } from '../stores/appData'
  import { assets } from '../stores/assets.js'
  import { ui } from '../stores/ui.js'
  import { selectionManager } from '../stores/selectionManager.js'
  import { scene } from '../stores/scene.js'

  import { setupMeasurementTools } from '../helpers/measureTools'

  import {
    Color,
    TreeItem,
    GLRenderer,
    Scene,
    resourceLoader,
    SystemDesc,
    EnvMap,
    CameraManipulator,
    AssetLoadContext,
    CADAsset,
    PMIItem,
    XRef,
  } from '@zeainc/zea-engine'
  import { SelectionManager, UndoRedoManager, ToolManager, SelectionTool } from '@zeainc/zea-ux'

  import { GLTFAsset } from '@zeainc/gltf-loader'

  let canvas
  let fpsContainer
  const urlParams = new URLSearchParams(window.location.search)
  let progress
  let fileLoaded = false
  let renderer

  const filterItemSelection = (item) => {
    let srcItem = item
    // Note: If faces and edges exist in the model, its because we
    // want to be able to highlight/select them.
    // For use case where only part selection is needed, this function
    // should walk up to the part.
    while (item && !(item instanceof PMIItem)) {
      item = item.getOwner()
    }
    if (!item) {
      return srcItem
    }
    return item
  }

  /** LOAD ASSETS METHODS START */
  const loadZCADAsset = (url, resources) => {
    const asset = new CADAsset()
    const context = new AssetLoadContext()
    context.resources = resources
    context.camera = renderer.getViewport().getCamera()

    const baseUrl = url.split('/').slice(0, -1).join('/')
    context.xrefLoadCallback = (path, xref) => {
      return baseUrl + '/' + path + '.zcad'
    }
    asset.load(url, context).then(() => {
      console.log('Loading CAD File version:', asset.cadfileVersion, ' exported using SDK:', asset.sdk)
      const materiaLibrary = asset.getMaterialLibrary()
      materiaLibrary.getMaterials().forEach((material) => {
        if (material.getShaderName() == 'LinesShader') {
          const opacityParam = material.getParameter('Opacity')
          opacityParam.value = 1.0
        } else if (material.getShaderName() == 'StandardSurfaceShader') {
          // It seems like edge colors are not showing up very well when drawing outlines.
          // The outlines seem too transparent. So forcing them to use the renderer.outlineColor
          const edgeColorParam = material.getParameter('EdgeColor')
          edgeColorParam.value = renderer.outlineColor
        }
      })

      renderer.frameAll()
    })
    $assets.addChild(asset)
    fileLoaded = true
    return asset
  }

  const loadGLTFAsset = (url, filename) => {
    const asset = new GLTFAsset()
    asset.load(url, filename).then(() => {
      renderer.frameAll()
    })
    $assets.addChild(asset)
    fileLoaded = true
    return asset
  }
  const loadAsset = (url, filename) => {
    if (filename.endsWith('zcad')) {
      return loadZCADAsset(url)
    } else if (filename.endsWith('gltf') || filename.endsWith('glb')) {
      return loadGLTFAsset(url, filename)
    }
  }
  /** LOAD ASSETS METHODS END */

  onMount(async () => {
    const { isMobileDevice } = SystemDesc

    renderer = new GLRenderer(canvas, {
      debugGeomIds: urlParams.has('debugGeomIds'),
      enableFrustumCulling: true,
      enableOcclusionCulling: false,
      /* Due to bugs in the mobile support for multi-draw, and the fact , we are */
      disableMultiDraw: ZeaSystemDesc.OS == 'Android',
    })

    $scene = new Scene()

    // Assigning an Environment Map enables PBR lighting for niceer shiny surfaces.
    if (!isMobileDevice && SystemDesc.gpuDesc.supportsWebGL2) {
      const envMap = new EnvMap('envMap')
      envMap.load('data/StudioG.zenv')
      envMap.headlightModeParam.value = true
      $scene.envMapParam.value = envMap
    }

    renderer.outlineThickness = 1.5
    renderer.outlineSensitivity = 5
    renderer.highlightOutlineThickness = 1.75
    renderer.outlineColor = new Color(0, 0, 0, 0.6)
    renderer.hiddenLineColor = new Color(0.2, 0.2, 0.2, 0.0)

    $scene.setupGrid(10, 10)
    renderer.getViewport().backgroundColorParam.value = new Color(0.85, 0.85, 0.85, 1)
    renderer.setScene($scene)

    const appData = {}

    appData.renderer = renderer
    appData.scene = $scene

    $assets = new TreeItem('Assets')
    appData.assets = $assets

    $scene.getRoot().addChild($assets)

    /** UNDO START */
    const undoRedoManager = UndoRedoManager.getInstance()
    appData.undoRedoManager = undoRedoManager
    /** UNDO END */

    /** SELECTION START */
    const cameraManipulator = renderer.getViewport().getManipulator()
    cameraManipulator.setDefaultManipulationMode(CameraManipulator.MANIPULATION_MODES.tumbler)
    // Make sure a double tap is required to aim the focus.
    cameraManipulator.aimFocusOnTouchTap = 2
    cameraManipulator.aimFocusOnMouseClick = 2
    appData.cameraManipulator = cameraManipulator
    const toolManager = new ToolManager(appData)
    $selectionManager = new SelectionManager(appData, {
      enableXfoHandles: true,
    })

    // Users can enable the handles usinga menu or hotkey.
    $selectionManager.showHandles(false)

    appData.selectionManager = $selectionManager

    const selectionTool = new SelectionTool(appData)
    selectionTool.setSelectionFilter(filterItemSelection)
    toolManager.registerTool('SelectionTool', selectionTool)
    toolManager.registerTool('CameraManipulator', cameraManipulator)

    renderer.getViewport().setManipulator(toolManager)
    toolManager.pushTool('CameraManipulator')
    appData.toolManager = toolManager

    setupMeasurementTools(toolManager, appData)

    // Note: the alpha value determines  the fill of the highlight.
    const selectionColor = new Color('#F9CE03')
    selectionColor.a = 0.1
    $selectionManager.selectionGroup.getParameter('HighlightColor').setValue(selectionColor)

    // Color the selection rect.
    const selectionRectColor = new Color(0, 0, 0, 1)
    selectionTool.rectItem.getParameter('Material').getValue().getParameter('BaseColor').setValue(selectionRectColor)

    /** SELECTION END */

    /** UX START */

    // const viewCube = document.getElementById('view-cube')
    // console.log('Setup Viewcube:', viewCube, renderer.getViewport())
    // viewCube.setViewport(renderer.getViewport())

    //long touch support
    var longTouchTimer = 0
    const camera = renderer.getViewport().getCamera()
    const startLongTouchTimer = (event, item) => {
      longTouchTimer = setTimeout(function () {
        //long touch for any click but we can specifify
        openMenu(event, item)
        longTouchTimer = 0
        camera.getParameter('GlobalXfo').off('valueChanged', endLogTouchTimer)
      }, 1000)
      camera.getParameter('GlobalXfo').on('valueChanged', endLogTouchTimer)
    }
    const endLogTouchTimer = () => {
      clearTimeout(longTouchTimer)
      longTouchTimer = 0
      camera.getParameter('GlobalXfo').off('valueChanged', endLogTouchTimer)
    }

    renderer.getViewport().on('pointerDown', (event) => {
      if (isMenuVisible) closeMenu()
      if (event.pointerType == 'touch' && event.intersectionData) {
        const item = filterItemSelection(event.intersectionData.geomItem)
        startLongTouchTimer(event, item)
      }
    })

    renderer.getViewport().on('pointerUp', (event) => {
      // Clear any pending long touch.
      if (longTouchTimer) {
        endLogTouchTimer(longTouchTimer)
      }
      if (event.pointerType == 'touch' && event.intersectionData && isMenuVisible) {
        // The menu was opened by the long touch. Prevent any other actions from occuring.
        event.stopPropagation()
      }

      // Detect a single touch, or a left button click.
      if (
        (event.pointerType == 'touch' && event.touches.length == 0 && event.changedTouches.length == 1) ||
        (event.pointerType == 'mouse' && event.button == 0)
      ) {
        // if the selection tool is active then do nothing, as it will
        // handle single click selection.s
        const toolStack = toolManager.toolStack
        if (toolStack[toolStack.length - 1] == selectionTool) return

        if (event.intersectionData) {
          // To provide a simple selection when the SelectionTool is not activated,
          // we toggle selection on the item that is selcted.
          const item = filterItemSelection(event.intersectionData.geomItem)
          if (item) {
            if (!event.shiftKey) {
              $selectionManager.toggleItemSelection(item, !event.ctrlKey)
            } else {
              const items = new Set()
              items.add(item)
              $selectionManager.deselectItems(items)
            }
          }
        } else {
          // $selectionManager.clearSelection()
          $selectionManager.setSelection(new Set(), true)
        }
      } else if (event.button == 2 && event.intersectionData) {
        // Detect a right click
        const item = filterItemSelection(event.intersectionData.geomItem)
        openMenu(event, item)
        // stop propagation to prevent the camera manipulator from handling the event.
        event.stopPropagation()
      }
    })

    renderer.getViewport().on('pointerDoublePressed', (event) => {
      // multi-touch is currently triggering a 'pointerDoublePressed' event.
      if (event.pointerType == 'touch' && event.touches.length == 2) return

      // Double click in empty space fits the data to the view.
      if (!event.intersectionData) {
        renderer.frameAll()
      }
    })
    /** UX END */

    /** PROGRESSBAR START */
    resourceLoader.on('progressIncremented', (event) => {
      progress = event.percent
    })
    /** PROGRESSBAR END */

    /** FPS DISPLAY START */
    const fpsDisplay = document.createElement('fps-display')
    fpsDisplay.renderer = renderer
    fpsContainer.appendChild(fpsDisplay)
    /** FPS DISPLAY END */

    /** LOAD ASSETS START */
    let assetUrl
    if (urlParams.has('zcad')) {
      assetUrl = urlParams.get('zcad')
      loadZCADAsset(assetUrl, assetUrl)
    }
    if (urlParams.has('gltf')) {
      assetUrl = urlParams.get('gltf')
      loadGLTFAsset(assetUrl, assetUrl)
    }
    /** LOAD ASSETS END */

    /** DYNAMIC SELECTION UI START */
    $selectionManager.on('leadSelectionChanged', (event) => {
      parameterOwner = event.treeItem
      $ui.shouldShowParameterOwnerWidget = parameterOwner
    })
    /** DYNAMIC SELECTION UI END */

    APP_DATA.set(appData)
  })

  let isMenuVisible = false
  let pos = { x: 0, y: 0 }
  let contextItem
  const openMenu = (event, item) => {
    contextItem = item
    pos = event.touches
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : { x: event.clientX, y: event.clientY }
    isMenuVisible = true
  }
  const closeMenu = () => {
    console.log('closeMenu:')
    isMenuVisible = false
  }
  let isDialogOpen = false
  const closeDialog = () => {
    isDialogOpen = false
  }

  /** LOAD ASSETS FROM FILE START */

  const handleCadFile = (event) => {
    const { files } = event.detail

    $assets.removeAllChildren()

    const urls = {}
    files.forEach((file) => {
      const filename = file.name
      const url = URL.createObjectURL(file)
      urls[filename] = url
    })

    files.forEach((file) => {
      if (file.name.endsWith('.zcad')) {
        const filename = file.name
        const assetItem = loadAsset(urls[filename], filename)

        const metadataFilename = filename.slice(0, filename.length - 5) + '.zmetadata'
        if (metadataFilename in urls) {
          assetItem.geomLibrary.once('loaded', () => {
            assetItem.loadMetadata(urls[metadataFilename])
          })
        }
      }
    })
  }

  /** LOAD ASSETS FROM FILE END */

  $: parameterOwner = null
</script>

<main class="relative flex-1 Main">
  <canvas bind:this={canvas} class="absolute w-full h-full" />

  <!-- <zea-view-cube id="view-cube" /> -->

  {#if !fileLoaded}
    <DropZone on:changeFile={handleCadFile} {fileLoaded} />
  {/if}

  <div class="absolute flex justify-center w-full bottom-3">
    <Toolbar />
  </div>

  <div bind:this={fpsContainer} />

  <Drawer>
    <Sidebar />
  </Drawer>

  {#if $ui.shouldShowParameterOwnerWidget}
    <ParameterOwnerWidget {parameterOwner} />
  {/if}
</main>

{#if progress < 100}
  <div class="fixed bottom-0 w-full">
    <ProgressBar {progress} />
  </div>
{/if}

<Dialog isOpen={isDialogOpen} close={closeDialog} {contextItem} />

{#if isMenuVisible}
  <Menu {...pos} on:click={closeMenu} on:clickoutside={closeMenu}>
    <MenuOption
      text="Hide"
      on:click={() => {
        contextItem.getParameter('Visible').setValue(false)
      }}
    />
    <MenuOption
      text="Properties"
      on:click={() => {
        if (contextItem) {
          isDialogOpen = true
          closeMenu()
        }
      }}
    />
  </Menu>
{/if}

<style>
  canvas {
    touch-action: none;
  }
</style>
