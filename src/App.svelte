<script>
  import { onMount } from 'svelte'
  import { getRamdomUser, getAppData } from './helpers/helpers.js'
  const { Xfo, Vec3, CuttingPlane, Color } = window.zeaEngine
  const {
    MeasurementTool,
    CreateFreehandLineTool,
    LinearMovementHandle,
    SelectionManager,
    SelectionTool,
  } = window.zeaUx
  import loadAsset from './loadAsset'

  const { Session, SessionSync } = window.zeaCollab

  let canvas
  let cuttingPlane
  let scene
  let renderer
  let userChip
  let userChipSet
  let measurementTool
  let freeHandLineTool
  let cameraManipulator
  let asset

  const useMeasurementTool = () => {
    if (renderer.getViewport().getManipulator() === measurementTool) {
      renderer.getViewport().setManipulator(cameraManipulator)
      canvas.style.cursor = 'auto'
      return
    }

    renderer.getViewport().setManipulator(measurementTool)
    canvas.style.cursor = 'cell'
  }

  const useCameraManipulator = () => {
    renderer.getViewport().setManipulator(cameraManipulator)

    freeHandLineTool.deactivateTool()
    canvas.style.cursor = 'auto'
  }

  const useFreeHandLineTool = () => {
    if (renderer.getViewport().getManipulator() === freeHandLineTool) {
      freeHandLineTool.deactivateTool()
      renderer.getViewport().setManipulator(cameraManipulator)
      canvas.style.cursor = 'auto'
      return
    }

    freeHandLineTool.activateTool()
    renderer.getViewport().setManipulator(freeHandLineTool)
    canvas.style.cursor = 'cell'
  }

  const addCuttingPlane = () => {
    // Setting up the CuttingPlane
    cuttingPlane = new CuttingPlane('CuttingPlane')
    const cuttingPlaneXfo = new Xfo()
    cuttingPlaneXfo.tr.set(0, 0, 0)
    cuttingPlaneXfo.ori.setFromAxisAndAngle(new Vec3(0, 1, 0), 1.55)
    cuttingPlane.getParameter('CutAwayEnabled').setValue(true)

    const linearHandle = new LinearMovementHandle('linear1', 0.05, 0.002, new Color('#FF0000'))
    // linearHandle.setTargetParam(cuttingPlane.getParameter('GlobalXfo'))
    linearHandle.getParameter('LocalXfo').setValue(cuttingPlaneXfo)
    linearHandle.addChild(cuttingPlane, false)
    scene.getRoot().addChild(linearHandle)
    cuttingPlane.addItem(asset)
  }

  onMount(async () => {
    const appData = getAppData(canvas)
    scene = appData.scene
    renderer = appData.renderer

    const selectionManager = new SelectionManager(appData, {
      enableXfoHandles: true,
    })

    const cameraManipulator = renderer.getViewport().getManipulator()
    const selectionTool = new SelectionTool({
      selectionManager,
      ...appData,
    })
    // appData.selectionManager = selectionManager

    let selectionOn = false
    const setToolToSelectionTool = () => {
      selectionTool.activateTool()
      renderer.getViewport().setManipulator(selectionTool)
      selectionOn = true
      selectionManager.showHandles('Translate')
    }

    const setToolToCameraManipulator = () => {
      renderer.getViewport().setManipulator(cameraManipulator)
      selectionOn = false
    }

    const userData = await getRamdomUser()

    const socketUrl = 'https://websocket-staging.zea.live'
    const session = new Session(userData, socketUrl)
    session.joinRoom('zea-template-svelte')

    const sessionSync = new SessionSync(session, appData, userData, {})
    userChipSet.session = session
    userChip.userData = userData

    asset = loadAsset()
    scene.getRoot().addChild(asset)

    // Initializing the treeview
    const sceneTreeView = document.getElementById('zea-tree-view')
    sceneTreeView.appData = appData
    sceneTreeView.rootItem = asset

    measurementTool = new MeasurementTool({ scene })
    measurementTool.activateTool()

    freeHandLineTool = new CreateFreehandLineTool(appData)

    renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(2.5, 0, 0), new Vec3(0, 0, 0))

    const toolbar = document.createElement('zea-toolbar')
    toolbar.tools = {
      cameraManipulator: {
        tag: 'zea-toolbar-tool',
        data: {
          iconName: 'camera-outline',
          toolName: 'Camera Manipulator',
          callback: () => {
            console.log('camera-outline')
            // useCameraManipulator()
          },
        },
      },
      measurementTool: {
        tag: 'zea-toolbar-tool',
        data: {
          iconName: 'resize-outline',
          toolName: 'Measurement Tool',
          callback: () => useMeasurementTool(),
        },
      },
      freeHandLineTool: {
        tag: 'zea-toolbar-tool',
        data: {
          iconName: 'draw-freehand',
          iconType: 'zea',
          toolName: 'Free Hand Line Tool',
          callback: () => useFreeHandLineTool(),
        },
      },
      cuttingPlaneTool: {
        tag: 'zea-toolbar-tool',
        data: {
          iconName: 'cut-outline',
          toolName: 'Add Cutting Plane',
          callback: () => addCuttingPlane(),
        },
      },
    }

    const sceneHost = document.getElementById('scene-host')
    sceneHost.prepend(toolbar)
  })
</script>

<zea-layout
  orientation="vertical"
  cell-a-size="2"
  resize-cell-a="false"
  cell-b-size="100%"
  cell-c-size="0"
  resize-cell-c="false"
>
  <!-- Header Start -->
  <div slot="a" class="App-header">
    <img alt="ZEA logo" class="App-logo" src="images/logo-zea.svg" />
    <div class="MenuHolder">
      <!-- <zea-menu type="dropdown" show-anchor="true">
        <zea-menu-item>
          Tools
          <zea-menu-subitems>
            <zea-menu-item class="MenuItem" hotkey="c" id="camera-manipulator" callback={useCameraManipulator}>
              Camera Manipulator
            </zea-menu-item>
            <zea-menu-item class="MenuItem" hotkey="m" id="measurement-tool" callback={useMeasurementTool}>
              Measurement Tool
            </zea-menu-item>
          </zea-menu-subitems>
        </zea-menu-item>
      </zea-menu> -->
    </div>
    <div class="UserChipSetHolder">
      <zea-user-chip-set bind:this={userChipSet} id="zea-user-chip-set" />
    </div>

    <zea-user-chip bind:this={userChip} id="zea-user-chip" />
  </div>
  <!-- Header End -->

  <zea-layout slot="b" cell-a-size="200" cell-b-size="100%" cell-c-size="0" resize-cell-c="false">
    <!-- Sidebar Start -->
    <zea-scroll-pane slot="a">
      <zea-tree-view id="zea-tree-view" />
    </zea-scroll-pane>
    <!-- Sidebar Start -->

    <!-- Viewport Start -->
    <div slot="b" id="scene-host"><canvas bind:this={canvas} id="renderer" /></div>
    <!-- Viewport Start -->
  </zea-layout>
</zea-layout>
