<script>
  import { redirect } from '@roxi/routify'
  import { onMount } from 'svelte'

  import { Quat, Vec3, CameraManipulator, Color } from '@zeainc/zea-engine'
  import { ToolManager } from '@zeainc/zea-ux'

  import Button from './Button.svelte'
  import Menu from './Menu.svelte'
  import MenuItem from './MenuItem.svelte'
  import MenuItemDropDown from './MenuItemDropDown.svelte'
  import MenuItemToggle from './MenuItemToggle.svelte'
  import MenuBar from './MenuBar.svelte'
  import MenuBarItem from './MenuBarItem.svelte'
  import UserChip from './UserChip.svelte'
  import UsersChips from './UsersChips.svelte'
  import SceneStatsDialog from '../components/SceneStatsDialog.svelte'

  import { auth } from '../helpers/auth'

  import { APP_DATA } from '../stores/appData'
  import { ui } from '../stores/ui.js'

  const urlParams = new URLSearchParams(window.location.search)
  const embeddedMode = urlParams.has('embedded')
  const collabEnabled = urlParams.has('roomId')
  let vrToggleMenuItemLabel = 'Detecting VR...'
  let vrToggleMenuItemDisabled = true

  let cameraManipulator
  let isTumblerEnabled = true
  let isTurnTableEnabled = false
  let isLightViewportEnabled = true
  let isDarkViewportEnabled = false
  let isSelectionEnabled = false
  let isTransformHandlesEnabled = false
  let renderer
  let session
  let sessionSync
  let selectionManager
  let toolManager
  let undoRedoManager
  let userData

  document.addEventListener('keydown', (event) => {
    const canvasIsTarget = event.target.contains(renderer.getGLCanvas())

    if (!canvasIsTarget) {
      return
    }

    const key = event.key.toLowerCase()

    switch (key) {
      case 'f':
        if (renderer) {
          renderer.frameAll()
        }
        break
      case 'z':
        if (event.ctrlKey && undoRedoManager) {
          undoRedoManager.undo()
        }
        break
      case 'y':
        if (event.ctrlKey && undoRedoManager) {
          undoRedoManager.redo()
        }
        break
    }
  })

  const handleTumblerEnabled = () => {
    cameraManipulator.setDefaultManipulationMode(CameraManipulator.MANIPULATION_MODES.tumbler)
    isTumblerEnabled = true
    isTurnTableEnabled = false
  }
  const handleTurnTableEnabled = () => {
    cameraManipulator.setDefaultManipulationMode(CameraManipulator.MANIPULATION_MODES.turntable)
    // The Tumbler mode prevents the camera from rolling upside down, so we correct it here.
    const cameraXfo = renderer.getViewport().getCamera().getParameter('GlobalXfo').getValue()
    const zaxis = cameraXfo.ori.getZaxis()
    let t = 0
    const id = setInterval(() => {
      t += 0.1
      const quat = new Quat()
      const xfo = cameraXfo.clone()
      quat.setFromDirectionAndUpvector(zaxis, new Vec3(0, 0, 1))
      xfo.ori = cameraXfo.ori.lerp(quat, Math.min(t, 1.0))
      renderer.getViewport().getCamera().getParameter('GlobalXfo').setValue(xfo)
      if (t >= 1.0) clearInterval(id)
    }, 20)
    isTurnTableEnabled = true
    isTumblerEnabled = false
  }

  const handleLightViewportEnabled = () => {
    renderer.getViewport().backgroundColorParam.value = new Color(0.85, 0.85, 0.85)
    isLightViewportEnabled = true
    isDarkViewportEnabled = false
  }
  const handleDarkViewportEnabled = () => {
    renderer.getViewport().backgroundColorParam.value = new Color(0.25, 0.25, 0.25)
    isLightViewportEnabled = false
    isDarkViewportEnabled = true
  }

  const handleMenuSelectionChange = () => {
    if (!toolManager) {
      return
    }

    isSelectionEnabled ? toolManager.pushTool('SelectionTool') : toolManager.popTool()
  }

  const handleMenuTransformHandlesChange = () => {
    console.log('showHandles')
    if (!selectionManager) {
      return
    }
    selectionManager.showHandles(isTransformHandlesEnabled)
    selectionManager.updateHandleVisibility()
  }

  let isDialogOpen = false
  const closeDialog = () => {
    isDialogOpen = false
  }
  const handleDisplaySceneStats = () => {
    isDialogOpen = true
  }

  onMount(() => {
    if (session) {
      session.leaveRoom()
    }

    vrToggleMenuItemLabel = 'VR Device Not Detected'

    APP_DATA.subscribe((appData) => {
      if (!appData || renderer) {
        return
      }

      renderer = appData.renderer
      selectionManager = appData.selectionManager
      toolManager = appData.toolManager
      cameraManipulator = appData.cameraManipulator
      undoRedoManager = appData.undoRedoManager
      {
        const { renderer } = $APP_DATA
        renderer
          .getXRViewport()
          .then((xrViewport) => {
            xrViewport.spectatorMode = false // disable by default.
            vrToggleMenuItemLabel = 'Launch VR'
            vrToggleMenuItemDisabled = false
            xrViewport.on('presentingChanged', (event) => {
              const { state } = event
              if (state) {
                vrToggleMenuItemLabel = 'Exit VR'
              } else {
                vrToggleMenuItemLabel = 'Launch VR'
              }
            })
          })
          .catch((reason) => {
            console.warn('Unable to setup XR:' + reason)
          })
      }
    })

    APP_DATA.subscribe((appData) => {
      if (!appData || session || !appData.session || !appData.sessionSync) {
        return
      }

      session = appData.session
      userData = appData.userData
      sessionSync = appData.sessionSync

      // SessionSync interactions.
      window.addEventListener('zeaUserClicked', (event) => {
        /* const userData = sessionSync.userDatas[event.detail.id] */
        /* if (userData) { */
        /*   const avatar = userData.avatar */
        /*   const viewXfo = avatar.viewXfo */
        /*   const focalDistance = avatar.focalDistance || 1.0 */
        /*   const target = viewXfo.tr.add( */
        /*     viewXfo.ori.getZaxis().scale(-focalDistance) */
        /*   ) */
        /*   if (cameraManipulator) */
        /*     cameraManipulator.orientPointOfView( */
        /*       viewport.getCamera(), */
        /*       viewXfo.tr, */
        /*       target, */
        /*       1.0, */
        /*       1000 */
        /*     ) */
        /* } */
      })
    })
  })

  // ////////////////////////////////////
  // UX

  const handleFrameAll = () => {
    const { renderer } = $APP_DATA
    renderer.frameAll()
  }

  const handleUndo = () => {
    const { undoRedoManager } = $APP_DATA
    undoRedoManager.undo()
  }

  const handleRedo = () => {
    const { undoRedoManager } = $APP_DATA
    undoRedoManager.redo()
  }

  let walkModeEnabled = false

  $: if (cameraManipulator) {
    cameraManipulator.enabledWASDWalkMode = walkModeEnabled
  }

  // ////////////////////////////////////
  // Asm
  let asmExplodeEnabled = false
  const handleAsmExplode = () => {
    $ui.asmExplodeEnabled = !$ui.asmExplodeEnabled
  }


  // ////////////////////////////////////
  // Collab

  const handleDA = () => {
    /* auth.getUserData().then((userData) => { */
    /*   if (!userData) { */
    /*     return */
    /*   } */
    /*   const { renderer, sessionSync } = $APP_DATA */
    /*   // SessionSync interactions. */
    /*   const camera = renderer.getViewport().getCamera() */
    /*   const xfo = camera.getParameter('GlobalXfo').getValue() */
    /*   const target = camera.getTargetPosition() */
    /*   sessionSync.directAttention(xfo.tr, target, 1, 1000) */
    /* }) */
  }

  // ////////////////////////////////////
  // VR

  const handleLaunchVR = () => {
    const { renderer } = $APP_DATA

    renderer
      .getXRViewport()
      .then((xrViewport) => {
        xrViewport.togglePresenting()
      })
      .catch((reason) => {
        console.warn('Unable to setup XR:' + reason)
      })
  }

  const handleToggleVRSpatatorMode = () => {
    const { renderer } = $APP_DATA
    renderer.getXRViewport().then((xrViewport) => {
      xrViewport.spectatorMode = !xrViewport.spectatorMode
    })
  }

  const handleSignOut = async () => {
    if (session) {
      session.leaveRoom()
    }

    await auth.signOut()
    $redirect('/login')
  }

  const handleClickMenuToggle = () => {
    $ui.shouldShowDrawer = !$ui.shouldShowDrawer
  }
</script>

{#if !embeddedMode}
  <header class="gap-2 items-center px-1 sm:px-2 py-1 text-gray-200 z-50 hidden sm:flex">
    <img class="h-6 ml-8" src="/images/logo-zea.svg" alt="logo" />

    <div>
      <MenuBar>
        <MenuBarItem label="View" let:isOpen>
          <Menu {isOpen}>
            <MenuItem label="Frame All" iconLeft="crop_free" shortcut="F" on:click={handleFrameAll} />
            <MenuItemToggle
              label="Camera Mode: TurnTable"
              bind:checked={isTurnTableEnabled}
              on:change={handleTurnTableEnabled}
            />
            <MenuItemToggle
              label="Camera Mode: Tumbler"
              bind:checked={isTumblerEnabled}
              on:change={handleTumblerEnabled}
            />
            <MenuItemToggle
              label="Viewport Background: Light"
              bind:checked={isLightViewportEnabled}
              on:change={handleLightViewportEnabled}
            />
            <MenuItemToggle
              label="Viewport Background: Dark"
              bind:checked={isDarkViewportEnabled}
              on:change={handleDarkViewportEnabled}
            />
            <MenuItem label="Display Scene Stats" on:click={handleDisplaySceneStats} />
          </Menu>
        </MenuBarItem>

        <MenuBarItem label="Edit" let:isOpen>
          <Menu {isOpen}>
            <MenuItem label="Undo" iconLeft="undo" shortcut="Ctrl+Z" on:click={handleUndo} />
            <MenuItem label="Redo" iconLeft="redo" shortcut="Ctrl+Y" on:click={handleRedo} />
            <MenuItemToggle
              bind:checked={isSelectionEnabled}
              label="Enable Selection Tool"
              on:change={handleMenuSelectionChange}
              shortcut="S"
            />
            <MenuItemToggle
              bind:checked={isTransformHandlesEnabled}
              label="Enable Transform Handles"
              on:change={handleMenuTransformHandlesChange}
              shortcut="T"
            />
            <MenuItemToggle bind:checked={walkModeEnabled} label="Enable Walk Mode (WASD)" />
          </Menu>
        </MenuBarItem>

        <MenuBarItem label="VR" let:isOpen>
          <Menu {isOpen}>
            <MenuItem disabled={vrToggleMenuItemDisabled} label={vrToggleMenuItemLabel} on:click={handleLaunchVR} />
          </Menu>
        </MenuBarItem>

        <MenuBarItem label="Asm" let:isOpen>
          <Menu {isOpen}>
            <MenuItem label="Explode" on:click={handleAsmExplode} />
          </Menu>
        </MenuBarItem>
      </MenuBar>
    </div>
  </header>
  <button
    class="cursor-default flex justify-center rounded z-50 fixed bg-background top-1 left-1"
    on:click={handleClickMenuToggle}
    title="{$ui.shouldShowDrawer ? 'Close' : 'Open'} drawer"
  >
    <span class="material-icons">
      {$ui.shouldShowDrawer ? 'menu_open' : 'menu'}
    </span>
  </button>

  <SceneStatsDialog isOpen={isDialogOpen} close={closeDialog} />
{/if}
