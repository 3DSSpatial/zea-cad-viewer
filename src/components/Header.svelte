<script>
  import { onMount } from 'svelte'

  const { CameraManipulator } = window.zeaEngine
  const { ToolManager } = window.zeaUx

  import Button from './Button.svelte'
  import Menu from './Menu.svelte'
  import MenuItem from './MenuItem.svelte'
  import MenuItemDropDown from './MenuItemDropDown.svelte'
  import MenuItemToggle from './MenuItemToggle.svelte'
  import MenuBar from './MenuBar.svelte'
  import MenuBarItem from './MenuBarItem.svelte'
  import UserChip from './UserChip.svelte'
  import UsersChips from './UsersChips.svelte'

  import { APP_DATA } from '../stores/appData'
  import { ui } from '../stores/ui.js'

  const urlParams = new URLSearchParams(window.location.search)
  const embeddedMode = urlParams.has('embedded')
  const collabEnabled = urlParams.has('roomId')
  let vrToggleMenuItemLabel = 'Detecting VR...'
  let vrToggleMenuItemDisabled = true

  let cameraManipulator
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

  const handleMenuSelectionChange = () => {
    if (!toolManager) {
      return
    }

    isSelectionEnabled
      ? toolManager.pushTool('SelectionTool')
      : toolManager.popTool()
  }

  const handleMenuTransformHandlesChange = () => {
    console.log('showHandles')
    if (!selectionManager) {
      return
    }
    selectionManager.showHandles(isTransformHandlesEnabled)
    selectionManager.updateHandleVisibility()
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
  }

  const handleClickMenuToggle = () => {
    $ui.shouldShowDrawer = !$ui.shouldShowDrawer
  }
</script>

{#if !embeddedMode}
  <header class="z-50 flex items-center px-1 py-1 text-gray-200 gap-2 sm:px-2">
    <button
      class="flex justify-center cursor-default w-7 h-7"
      on:click={handleClickMenuToggle}
      title="{$ui.shouldShowDrawer ? 'Close' : 'Open'} drawer"
    >
      <span class="material-icons">
        {$ui.shouldShowDrawer ? 'menu_open' : 'menu'}
      </span>
    </button>

    <img class="h-6" src="/images/logo-zea.svg" alt="logo" />

    <div class="hidden sm:block">
      <MenuBar>
        <MenuBarItem label="View" let:isOpen>
          <Menu {isOpen}>
            <MenuItem
              label="Frame All"
              iconLeft="crop_free"
              shortcut="F"
              on:click={handleFrameAll}
            />
          </Menu>
        </MenuBarItem>

        <MenuBarItem label="Edit" let:isOpen>
          <Menu {isOpen}>
            <MenuItem
              label="Undo"
              iconLeft="undo"
              shortcut="Ctrl+Z"
              on:click={handleUndo}
            />
            <MenuItem
              label="Redo"
              iconLeft="redo"
              shortcut="Ctrl+Y"
              on:click={handleRedo}
            />
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
            <MenuItemToggle
              bind:checked={walkModeEnabled}
              label="Enable Walk Mode (WASD)"
            />
          </Menu>
        </MenuBarItem>

        <MenuBarItem label="Collab" let:isOpen>
          <Menu {isOpen}>
            <MenuItem
              iconLeft="visibility"
              label="Direct Attention"
              shortcut="Ctrl+N"
              on:click={handleDA}
            />
          </Menu>
        </MenuBarItem>

        <MenuBarItem label="VR" let:isOpen>
          <Menu {isOpen}>
            <MenuItem
              disabled={vrToggleMenuItemDisabled}
              label={vrToggleMenuItemLabel}
              on:click={handleLaunchVR}
            />
            <MenuItem
              label="Enable Spectator Mode"
              on:click={handleToggleVRSpatatorMode}
            />
          </Menu>
        </MenuBarItem>
      </MenuBar>
    </div>

    {#if $APP_DATA}
      {#if collabEnabled}
        <UsersChips session={$APP_DATA.session} />
      {/if}
      {#if !collabEnabled}
        <div class="flex-1" />
      {/if}

      <!--
      <UserChip user={$APP_DATA.userData}>
        <div class="text-center">
          <Button on:click={handleSignOut}>Sign Out</Button>
        </div>
      </UserChip>
      -->
    {/if}
  </header>
{/if}
