<script>
  import { onMount } from 'svelte'
  const { Color, GLRenderer, Scene, Xfo, Vec3, CuttingPlane, CameraManipulator, TreeItem } = window.zeaEngine

  const {
    MeasurementTool,
    CreateFreehandLineTool,
    LinearMovementHandle,
    SelectionManager,
    SelectionTool,
  } = window.zeaUx

  import { setupCollab } from './setupCollab.js'
  import loadAsset from './loadAsset'
  import { ToolManager } from './ToolManager.js'
  import { ChannelMessenger } from './ChannelMessenger.js'

  let canvas
  let userChip
  let userChipSet
  /*
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
*/

  onMount(async () => {
    const renderer = new GLRenderer(canvas)
    const scene = new Scene()

    // scene.setupGrid(10, 10)
    renderer.setScene(scene)
    renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(2.5, 2.5, 3), new Vec3(0, 0, 0))

    const color = new Color('#aaaaaa')
    scene.getSettings().getParameter('BackgroundColor').setValue(color)

    const appData = {
      scene,
      renderer,
    }

    // ////////////////////////////////////////////
    // Setup SelectionManager
    const selectionManager = new SelectionManager(appData, {
      enableXfoHandles: false,
    })

    appData.selectionManager = selectionManager

    // ////////////////////////////////////////////
    // Initializing the treeview
    const sceneTreeView = document.getElementById('zea-tree-view')
    sceneTreeView.appData = appData

    // ////////////////////////////////////////////
    // Setup Tools

    const cameraManipulator = renderer.getViewport().getManipulator()
    cameraManipulator.setDefaultManipulationMode(CameraManipulator.MANIPULATION_MODES.trackball)

    // /////////////////
    // Selection Tool

    const selectionTool = new SelectionTool(appData)
    // selectionManager.showHandles('Xfo')
    selectionTool.setSelectionFilter((item) => {
      while (
        item.getName().startsWith('Mesh') ||
        item.getName().startsWith('Edge') ||
        item.getName().startsWith('TreeItem')
      ) {
        item = item.getOwner()
      }
      return item
    })

    const measurementTool = new MeasurementTool(appData)
    const freeHandLineTool = new CreateFreehandLineTool(appData)
    freeHandLineTool.getParameter('LineThickness').setValue(0.001)

    const toolManager = new ToolManager()
    toolManager.registerTool('CameraManipulator', cameraManipulator)
    toolManager.registerTool('SelectionTool', selectionTool)
    toolManager.registerTool('FreehandLineTool', freeHandLineTool)
    toolManager.registerTool('MeasurementTool', measurementTool)
    toolManager.pushTool('CameraManipulator')
    renderer.getViewport().setManipulator(toolManager)

    let currentToolName = 'CameraManipulator'
    const pushTool = (toolName) => {
      if (toolName !== currentToolName) {
        if (currentToolName != 'CameraManipulator') toolManager.popTool()
        toolManager.pushTool(toolName)
        currentToolName = toolName
      }
    }

    const popTool = (toolName) => {
      if (toolName == currentToolName) {
        toolManager.popTool()
        currentToolName = 'CameraManipulator'
      }
    }

    let currentColor = new Color('yellow')
    const setColor = (color) => {
      currentColor = color
    }

    const toolbar = document.createElement('zea-toolbar')
    toolbar.tools = {
      cameraManipulator: {
        tag: 'zea-toolbar-tool',
        data: {
          icon: 'camera-outline',
          toolName: 'Camera Manipulator',
          callback: () => {
            pushTool('SelectionTool')
          },
          offCallback: () => {
            popTool('SelectionTool')
          },
        },
      },
      measurementTool: {
        tag: 'zea-toolbar-tool',
        data: {
          icon: 'resize-outline',
          toolName: 'Measurement Tool',
          callback: () => {
            measurementTool.getParameter('Color').setValue(currentColor)
            pushTool('MeasurementTool')
          },
          offCallback: () => {
            popTool('MeasurementTool')
          },
        },
      },
      freeHandLineTool: {
        tag: 'zea-toolbar-tool',
        data: {
          icon: 'draw-freehand',
          iconType: 'zea',
          toolName: 'Free Hand Line Tool',
          callback: () => {
            freeHandLineTool.getParameter('LineColor').setValue(currentColor)
            pushTool('FreehandLineTool')
          },
          offCallback: () => {
            popTool('FreehandLineTool')
          },
        },
      },
      cuttingPlaneTool: {
        tag: 'zea-toolbar-tool',
        data: {
          icon: 'cut-outline',
          toolName: 'Add Cutting Plane',
          callback: () => addCuttingPlane(),
          offCallback: () => {
            popTool('FreehandLineTool')
          },
        },
      },
      colors: {
        tag: 'zea-toolbar-colorpicker',
        data: {
          colors: {
            color1: {
              background: 'yellow',
              foreground: 'white',
              callback: (e) => setColor(new Color('yellow')),
            },
            color2: {
              background: 'red',
              foreground: 'white',
              callback: (e) => setColor(new Color('#FF0000')),
            },
            color3: {
              background: 'green',
              foreground: 'white',
              callback: (e) => setColor(new Color('#00FF00')),
            },
            color4: {
              background: 'blue',
              foreground: 'white',
              callback: (e) => setColor(new Color('#0000FF')),
            },
          },
        },
      },
    }
    const sceneHost = document.getElementById('scene-host')
    sceneHost.prepend(toolbar)

    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'b':
          break
        case 'z':
          if (e.ctrlKey) {
            const undoRedoManager = UndoRedoManager.getInstance()
            undoRedoManager.undo()
          }
          break
        case 'y':
          if (e.ctrlKey) {
            const undoRedoManager = UndoRedoManager.getInstance()
            undoRedoManager.redo()
          }
          break
      }
    })

    ////////////////////////////////
    //
    const assets = new TreeItem('-')
    scene.getRoot().addChild(assets)
    sceneTreeView.rootItem = assets

    // loadAsset(assets, appData, { url: 'assets/servo_mestre-visu.zcad' })
    /////////////////////////////////
    // Setup Message Channel

    const client = new ChannelMessenger()
    client.on('loadCADFile', (data) => {
      console.log('loadCADFile', data)

      if (!data.keep) {
        assets.removeAllChildren()
      }

      loadAsset(assets, appData, data)
    })

    client.on('unloadCADFile', (data) => {
      console.log('unloadCADFile', data)

      assets.removeChildByName(data.name)
    })

    selectionManager.on('selectionChanged', (event) => {
      const { selection } = event
      const selectionPaths = []
      selection.forEach((item) => selectionPaths.push(item.getPath().slice(2)))
      client.send('selectionChanged', { selection: selectionPaths })
    })

    ////////////////////////////////
    // Collab
    // setupCollab(appData, userChip, userChipSet)
  })
</script>

<zea-layout
  orientation="vertical"
  cell-a-size="2"
  resize-cell-a="false"
  cell-b-size="100%"
  cell-c-size="2"
  resize-cell-c="false"
>
  <!-- Header Start -->
  <div slot="a" class="App-header">
    <!-- <img alt="ZEA logo" class="App-logo" src="images/logo-zea.svg" />
    <div class="UserChipSetHolder">
      <zea-user-chip-set bind:this={userChipSet} id="zea-user-chip-set" />
    </div>

    <zea-user-chip bind:this={userChip} id="zea-user-chip" /> -->
  </div>
  <!-- Header End -->

  <zea-layout slot="b" cell-a-size="2" resize-cell-a="false" cell-b-size="100%" cell-c-size="200" resize-cell-c="true">
    <!-- Viewport Start -->
    <div slot="b" id="scene-host"><canvas bind:this={canvas} id="renderer" /></div>
    <!-- Viewport Start -->

    <!-- Sidebar Start -->
    <zea-scroll-pane slot="c">
      <zea-tree-view id="zea-tree-view" />
    </zea-scroll-pane>
    <!-- Sidebar Start -->
  </zea-layout>
</zea-layout>
