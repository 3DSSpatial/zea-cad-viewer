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

  import { APP_DATA } from '../stores/appData'
  import { assets } from '../stores/assets.js'
  import { ui } from '../stores/ui.js'
  import { selectionManager } from '../stores/selectionManager.js'
  import { scene } from '../stores/scene.js'
  import { zeaCloudClient } from '../stores/zeaCloudClient'

  import { createClient } from '../ChannelMessenger.js'
  import buildTree from '../helpers/buildTree'

  const {
    Color,
    Vec3,
    Xfo,
    TreeItem,
    GLRenderer,
    Scene,
    resourceLoader,
    SystemDesc,
    EnvMap,
    InstanceItem,
    CameraManipulator,
  } = window.zeaEngine
  const { CADAsset, CADBody } = window.zeaCad
  const { SelectionManager, UndoRedoManager, ToolManager, SelectionTool } =
    window.zeaUx

  const { Session, SessionSync } = window.zeaCollab

  let canvas
  let fpsContainer
  const urlParams = new URLSearchParams(window.location.search)
  const embeddedMode = urlParams.has('embedded')
  const collabEnabled = urlParams.has('roomId')
  let progress
  let files = ''

  const filterItemSelection = (item) => {
    // Propagate selections up from the edges and surfaces up to
    // the part body or the instanced body
    while (
      item &&
      !(item instanceof CADBody) &&
      !(item instanceof InstanceItem && item.getSrcTree() instanceof CADBody)
    ) {
      item = item.getOwner()
    }
    return item
  }

  let renderer

  const loadZCADAsset = (url) => {
    const asset = new CADAsset()
    // TODO: frame all can occur in the initial load
    asset.getGeometryLibrary().once('loaded', () => {
      renderer.frameAll()
    })
    asset.load(url).then(() => {
      const box = asset.getParameter('BoundingBox').getValue()
      const xfo = new Xfo()
      // xfo.ori.setFromAxisAndAngle(new Vec3(1, 0, 0), Math.PI * 0.5)
      xfo.tr.z = -box.p0.z
      asset.getParameter('LocalXfo').setValue(xfo)
    })
    $assets.addChild(asset)
    return asset
  }

  /** LOAD ASSETS METHODS START */
  const { GLTFAsset } = gltfLoader
  const loadGLTFAsset = (url, filename) => {
    const asset = new GLTFAsset('gltf')
    asset.load(url, filename).then(() => {
      const box = asset.getParameter('BoundingBox').getValue()
      const xfo = new Xfo()
      // xfo.ori.setFromAxisAndAngle(new Vec3(1, 0, 0), Math.PI * 0.5)
      xfo.tr.z = -box.p0.z
      asset.getParameter('LocalXfo').setValue(xfo)
      renderer.frameAll()
    })
    $assets.addChild(asset)
    return asset
  }

  const loadAsset = (url, fileName) => {
    return loadZCADAsset(url)
  }
  /** LOAD ASSETS METHODS END */

  /* {{{ Zea Cloud Client. */
  $: if ($zeaCloudClient) {
    const organizationId = urlParams.get('organization-id')
    const projectId = urlParams.get('project-id')
    const fileId = urlParams.get('file-id')

    $zeaCloudClient.findOrganization(organizationId).then((organization) => {
      organization.findProject(projectId).then((project) => {
        project.fetchLatestVersion().then(() => {
          const file = project.getFileById(fileId)
          const processName = 'cad'
          const filename = 'output.zcad'
          file
            .getSignedUrlForReading(processName, filename)
            .then((response) => {
              let assetUrl = response.signedUrl
              loadAsset(assetUrl, filename)
            })
        })
      })
    })
  }
  /* }}} Zea Cloud Client. */

  onMount(async () => {
    renderer = new GLRenderer(canvas)

    $scene = new Scene()

    // Assigning an Environment Map enables PBR lighting for niceer shiny surfaces.
    if (!SystemDesc.isMobileDevice && SystemDesc.gpuDesc.supportsWebGL2) {
      const envMap = new EnvMap('envMap')
      envMap.getParameter('FilePath').setValue('data/StudioG.zenv')
      envMap.getParameter('HeadLightMode').setValue(true)
      $scene.getSettings().getParameter('EnvMap').setValue(envMap)
    }

    renderer.outlineThickness = 1
    renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

    // $scene.setupGrid(10, 10)
    $scene
      .getSettings()
      .getParameter('BackgroundColor')
      .setValue(new Color(0.85, 0.85, 0.85, 1))
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
    cameraManipulator.setDefaultManipulationMode(
      CameraManipulator.MANIPULATION_MODES.tumbler
    )
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

    // Note: the alpha value determines  the fill of the highlight.
    const selectionColor = new Color('#F9CE03')
    selectionColor.a = 0.1
    const subtreeColor = selectionColor //.lerp(new Color(1, 1, 1, 0), 0.5)
    $selectionManager.selectionGroup
      .getParameter('HighlightColor')
      .setValue(selectionColor)
    $selectionManager.selectionGroup
      .getParameter('SubtreeHighlightColor')
      .setValue(subtreeColor)

    // Color the selection rect.
    const selectionRectColor = new Color(0, 0, 0, 1)
    selectionTool.rectItem
      .getParameter('Material')
      .getValue()
      .getParameter('BaseColor')
      .setValue(selectionRectColor)

    /** SELECTION END */

    /* {{{ UX */
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
      if (
        event.pointerType == 'touch' &&
        event.intersectionData &&
        isMenuVisible
      ) {
        // The menu was opened by the long touch. Prevent any other actions from occuring.
        event.stopPropagation()
      }

      // Detect a right click
      if (event.button == 0 && event.intersectionData) {
        // if the selection tool is active then do nothing, as it will
        // handle single click selection.s
        const toolStack = toolManager.toolStack
        if (toolStack[toolStack.length - 1] == selectionTool) return

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
      } else if (event.button == 2 && event.intersectionData) {
        const item = filterItemSelection(event.intersectionData.geomItem)
        openMenu(event, item)
        // stop propagation to prevent the camera manipulator from handling the event.
        event.stopPropagation()
      }
    })

    renderer.getViewport().on('pointerDoublePressed', (event) => {
      console.log(event)
    })
    /* }}} UX */

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

    /** COLLAB START /
    if (!embeddedMode) {
      const userData = await auth.getUserData()
      if (!userData) {
        return
      }
      appData.userData = userData

      if (collabEnabled) {
        const SOCKET_URL = 'https://websocket-staging.zea.live'
        // const roomId = assetUrl
        const roomId = urlParams.get('roomId')
        const session = new Session(userData, SOCKET_URL)
        if (roomId) session.joinRoom(roomId)

        const sessionSync = new SessionSync(session, appData, userData, {})

        appData.session = session
        appData.sessionSync = sessionSync

        APP_DATA.update(() => appData)
      }
    }
    /** COLLAB END */

    /** EMBED MESSAGING START*/
    if (embeddedMode) {
      const client = createClient()

      client.on('setBackgroundColor', (data) => {
        const color = new Color(data.color)
        $scene.getSettings().getParameter('BackgroundColor').setValue(color)

        if (data._id) {
          client.send(data._id, { done: true })
        }
      })

      client.on('loadCADFile', (data) => {
        console.log('loadCADFile', data)
        if (!data.keep) {
          $assets.removeAllChildren()
        }

        const asset = loadAsset(data.url)
        asset.once('loaded', () => {
          if (data._id) {
            const tree = buildTree(asset)
            client.send(data._id, { modelStructure: tree })
          }
        })
      })

      client.on('getModelStructure', (data) => {
        if (data._id) {
          const tree = buildTree($assets)
          client.send(data._id, { modelStructure: tree })
        }
      })

      client.on('unloadCADFile', (data) => {
        console.log('unloadCADFile', data)

        $assets.removeChildByName(data.name)

        if (data._id) {
          client.send(data._id, { done: true })
        }
      })

      $selectionManager.on('selectionChanged', (event) => {
        const { selection } = event
        const selectionPaths = []
        selection.forEach((item) =>
          selectionPaths.push(item.getPath().slice(2))
        )
        client.send('selectionChanged', { selection: selectionPaths })
      })
    }
    /** EMBED MESSAGING END */

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

  const handleCadFile = () => {
    const objectURL = window.URL.createObjectURL(files)

    const asset = loadAsset(objectURL, files.name)
  }

  /** LOAD ASSETS FROM FILE END */

  $: parameterOwner = null
</script>

<main class="relative flex-1 Main">
  <canvas bind:this={canvas} class="absolute w-full h-full" />

  <div class="absolute flex justify-center w-full bottom-10">
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
