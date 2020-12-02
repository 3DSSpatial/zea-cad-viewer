<script>
  import { onMount } from 'svelte'
  const {
    SystemDesc,
    Color,
    GLRenderer,
    Scene,
    Xfo,
    Vec3,
    EnvMap,
    CuttingPlane,
    CameraManipulator,
    TreeItem,
    Material,
    Sphere,
    GeomItem,
    GLBoundingBoxPass,
  } = window.zeaEngine

  const { GLCADPass } = window.zeaCad

  const { CreateFreehandLineTool, LinearMovementHandle, XfoHandle, SelectionManager, SelectionTool } = window.zeaUx

  import { setupCollab } from './setupCollab.js'
  import loadAsset from './loadAsset'
  import buildTree from './buildTree'
  import { ToolManager } from './ToolManager.js'
  import { ChannelMessenger } from './ChannelMessenger.js'
  import { MeasurementTool } from './MeasurementTool.js'

  let canvas
  let userChip
  let userChipSet

  const urlParams = new URLSearchParams(document.location.search)
  const notree = urlParams.has('notree')

  onMount(async () => {
    const client = new ChannelMessenger()

    const renderer = new GLRenderer(canvas)
    const scene = new Scene()

    renderer.addPass(new GLCADPass())

    scene.setupGrid(10, 10)
    renderer.setScene(scene)
    renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(2.5, 2.5, 3), new Vec3(0, 0, 0))

    if (!SystemDesc.isMobileDevice) {
      const envMap = new EnvMap('envMap')
      envMap.getParameter('HeadLightMode').setValue(true)
      envMap.getParameter('FilePath').setValue('assets/HDR_029_Sky_Cloudy_Ref.vlenv')
      scene.setEnvMap(envMap)
    }
    // scene.getSettings().getParameter('BackgroundColor').setValue(new Color('#D9EAFA'))

    const color = new Color('#E9E7E9')
    scene.getSettings().getParameter('BackgroundColor').setValue(color)

    client.on('setBackgroundColor', (data) => {
      const color = new Color(data.color)
      scene.getSettings().getParameter('BackgroundColor').setValue(color)

      if (data._id) {
        client.send(data._id, { done: true })
      }
    })

    ////////////////////////////////
    //
    const assets = new TreeItem('-')
    scene.getRoot().addChild(assets)

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
    let sceneTreeView
    if (!notree) {
      sceneTreeView = document.getElementById('zea-tree-view')
      sceneTreeView.appData = appData
      sceneTreeView.items = []
    }

    // ////////////////////////////////////////////
    // Setup Tools

    const cameraManipulator = renderer.getViewport().getManipulator()
    cameraManipulator.setDefaultManipulationMode(CameraManipulator.MANIPULATION_MODES.trackball)

    // /////////////////
    // Selection Tool

    const selectionTool = new SelectionTool(appData)
    // 3CB0F2

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

    // /////////////////
    // Cutting plane Tool
    let cuttingPlane

    const enableCuttingPlane = () => {
      // Setting up the CuttingPlane
      if (!cuttingPlane) {
        cuttingPlane = new CuttingPlane('CuttingPlane')
        cuttingPlane.getParameter('CutAwayEnabled').setValue(true)

        const xfoHandle = new XfoHandle(0.1, 0.002)
        xfoHandle.setTargetParam(cuttingPlane.getParameter('GlobalXfo'))
        cuttingPlane.addChild(xfoHandle, false)

        scene.getRoot().addChild(cuttingPlane)
        cuttingPlane.addItem(assets)
      } else {
        cuttingPlane.getParameter('Visible').setValue(true)

        cuttingPlane.removeItem(assets)
        cuttingPlane.addItem(assets)
      }
    }
    const disableCuttingPlane = () => {
      if (cuttingPlane) {
        cuttingPlane.getParameter('Visible').setValue(false)
      }
    }

    const toolManager = new ToolManager()
    toolManager.registerTool('CameraManipulator', cameraManipulator)
    toolManager.registerTool('SelectionTool', selectionTool)
    toolManager.registerTool('FreehandLineTool', freeHandLineTool)
    toolManager.registerTool('MeasurementTool', measurementTool)

    renderer.getViewport().setManipulator(toolManager)
    toolManager.pushTool('CameraManipulator')

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
    let setColorCb
    const setColor = (color) => {
      currentColor = color
      if (setColorCb) setColorCb()
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
            setColorCb = () => {
              measurementTool.getParameter('Color').setValue(currentColor)
            }
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
            setColorCb = () => {
              freeHandLineTool.getParameter('LineColor').setValue(currentColor)
            }
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
          callback: () => {
            if (currentToolName != 'CameraManipulator') {
              toolManager.popTool()
            }
            enableCuttingPlane()
          },
          offCallback: () => {
            disableCuttingPlane()
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
        case 'f':
          const selection = selectionManager.getSelection()
          renderer.frameAll()
          break
      }
    })

    /////////////////////////////////
    // Setup Message Channel
    client.on('loadCADFile', (data) => {
      console.log('loadCADFile', data)

      if (!data.keep) {
        assets.removeAllChildren()
      }

      const asset = loadAsset(appData, data)

      asset.once('loaded', () => {
        renderer.frameAll()
      })

      assets.addChild(asset)

      if (data._id) {
        asset.once('loaded', () => {
          if (sceneTreeView) {
            const assetArray = []
            for (let i = 0; i < assets.getNumChildren(); i++) {
              assetArray.push(assets.getChild(i))
            }
            sceneTreeView.items = assetArray
          }

          const tree = buildTree(asset)
          client.send(data._id, { modelStructure: tree })
        })
      }
    })

    client.on('unloadCADFile', (data) => {
      console.log('unloadCADFile', data)

      assets.removeChildByName(data.name)

      if (data._id) {
        client.send(data._id, { done: true })
      }
    })

    // //////////////////////////////////////////////////////
    // Debugging

    const boundingBoxPass = new GLBoundingBoxPass()
    renderer.addPass(boundingBoxPass)
    boundingBoxPass.addTreeItem(assets, true)

    client.emit('loadCADFile', { url: '../assets/Dead_eye_bearingSTEP.zcad' })

    // const ballMaterial = new Material('ball', 'HandleShader')
    // ballMaterial.getParameter('BaseColor').setValue(new Color(1, 0, 0))
    // ballMaterial.getParameter('MaintainScreenSize').setValue(true)

    // const sphere = new Sphere(0.003)
    // const markerGeomItem0 = new GeomItem('Sphere0', sphere, ballMaterial)
    // scene.getRoot().addChild(markerGeomItem0)
    // const globalXfoParam0 = markerGeomItem0.getParameter('GlobalXfo')
    // const markerGeomItem1 = new GeomItem('Sphere0', sphere, ballMaterial)
    // scene.getRoot().addChild(markerGeomItem1)
    // const globalXfoParam1 = markerGeomItem1.getParameter('GlobalXfo')

    // let snapTarget
    // renderer.getViewport().on('pointerMove', (event) => {
    //   // console.log('pointerMove', event.pointerRay.toString())

    //   if (pointerDown) {
    //     const param = event.pointerRay.closestPoint(snapTarget.point)
    //     if (param > 0) {
    //       const pointOnRay = event.pointerRay.start.add(event.pointerRay.dir.scale(param))
    //       markerGeomItem1.getParameter('Visible').setValue(true)
    //       globalXfoParam1.setValue(new Xfo(pointOnRay))
    //     }
    //   } else {
    //     const data = { ray: event.pointerRay, tolerance: 0.005 }
    //     assets.query('closestEdgeOrSurface', data).then((results) => {
    //       if (results) {
    //         markerGeomItem0.getParameter('Visible').setValue(true)
    //         globalXfoParam0.setValue(new Xfo(results.point))
    //         snapTarget = results
    //       } else {
    //         markerGeomItem0.getParameter('Visible').setValue(false)
    //         snapTarget = null
    //       }
    //     })
    //   }
    // })
    // let pointerDown = false
    // renderer.getViewport().on('pointerDown', (event) => {
    //   if (snapTarget) {
    //     pointerDown = true
    //     event.stopPropagation()
    //   }
    // })
    // renderer.getViewport().on('pointerUp', (event) => {
    //   if (snapTarget) {
    //     pointerDown = false
    //     event.stopPropagation()
    //   }
    // })
    // //////////////////////////////////////////////////////

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

  {#if notree}
    <div slot="b" id="scene-host"><canvas bind:this={canvas} id="renderer" /></div>
  {:else}
    <zea-layout
      slot="b"
      cell-a-size="2"
      resize-cell-a="false"
      cell-b-size="100%"
      cell-c-size="200"
      resize-cell-c="true"
    >
      <!-- Viewport Start -->
      <div slot="b" id="scene-host"><canvas bind:this={canvas} id="renderer" /></div>
      <!-- Viewport Start -->

      <!-- Sidebar Start -->

      <zea-scroll-pane slot="c">
        <zea-tree-view id="zea-tree-view" />
      </zea-scroll-pane>
      <!-- Sidebar End -->
    </zea-layout>
  {/if}
</zea-layout>
