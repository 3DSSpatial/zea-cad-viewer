<script>
  import { onMount } from 'svelte'
  import { getRamdomUser, getAppData } from './helpers/helpers.js'
  const { GeomItem, Material, Color, Xfo, Vec3, Group, Cuboid, Sphere, Torus } = window.zeaEngine
  const { MeasurementTool } = window.zeaUx

  const { Session, SessionSync } = window.zeaCollab

  let canvas
  let parameterContainerEl
  let scene
  let renderer
  let userChip
  let userChipSet
  let measurementTool
  let cameraManipulator

  onMount(async () => {
    const appData = getAppData(canvas)
    scene = appData.scene
    renderer = appData.renderer

    parameterContainerEl.appData = appData
    parameterContainerEl.parameterOwner = scene.getRoot()


    const userData = await getRamdomUser()

    const socketUrl = 'https://websocket-staging.zea.live'
    const session = new Session(userData, socketUrl)
    session.joinRoom('zea-template-svelte')

    const sessionSync = new SessionSync(session, appData, userData, {})
    userChipSet.session = session
    userChip.userData = userData

    // Initializing the treeview
    const sceneTreeView = document.getElementById('zea-tree-view')
    sceneTreeView.appData = appData
    sceneTreeView.rootItem = appData.scene.getRoot()

    {
        const green = new Material('material1', 'SimpleSurfaceShader')
        green.getParameter('BaseColor').setValue(new Color('#94C47D'))

        const geomItem1 = new GeomItem('GreenCuboid', new Cuboid(3, 3, 3, true), green)
        scene.getRoot().addChild(geomItem1)

        const blue = new Material('material2', 'SimpleSurfaceShader')
        blue.getParameter('BaseColor').setValue(new Color('#35257D'))

        const geomItem2 = new GeomItem('BlueSphere', new Sphere(0.2, 12), blue)

        const geomItem2Xfo = new Xfo()
        geomItem2Xfo.tr = new Vec3(1, 0, 2)
        geomItem2.getParameter('GlobalXfo').setValue(geomItem2Xfo)

        scene.getRoot().addChild(geomItem2)

        const purple = new Material('material3', 'SimpleSurfaceShader')
        purple.getParameter('BaseColor').setValue(new Color('#FF257D'))

        const geomItem3 = new GeomItem('PurpleSphere', new Sphere(0.2, 12), purple)

        const geomItem3Xfo = new Xfo()
        geomItem3Xfo.tr = new Vec3(-1, 1, 1)
        geomItem3.getParameter('GlobalXfo').setValue(geomItem3Xfo)

        scene.getRoot().addChild(geomItem3)

        const geomItem4 = new GeomItem('GreenTorus', new Torus(0.1, 0.2), green)

        const geomItem4Xfo = new Xfo()
        geomItem4Xfo.tr = new Vec3(-1, -1, 1)
        geomItem4.getParameter('GlobalXfo').setValue(geomItem4Xfo)

        scene.getRoot().addChild(geomItem4)

        // CutAway
        const cutAwayGroup = new Group('CutAwayGroup')
        cutAwayGroup.getParameter('CutAwayEnabled').setValue(true);
        cutAwayGroup.getParameter('CutPlaneDist').setValue(0.5);
        cutAwayGroup.getParameter('CutPlaneNormal').setValue(new Vec3(1, 0.5, 0));

        // Add items to cut
        cutAwayGroup.addItem(geomItem1)

        cutAwayGroup.on('pointerDown', (event) => {
          event.stopPropagation()
          console.log('ParameterOwner')

          parameterContainerEl.parameterOwner = cutAwayGroup
        })

        scene.getRoot().addChild(cutAwayGroup)
      }

      measurementTool = new MeasurementTool({ scene })
      measurementTool.activateTool()

      cameraManipulator = renderer.getViewport().getManipulator()

      renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(5, 6, 9), new Vec3(0, 0, 0))
  })

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
    canvas.style.cursor = 'auto'
  }
</script>

<zea-layout orientation="vertical" cell-a-size="50" resize-cell-a="false" cell-b-size="100%" cell-c-size="0" resize-cell-c="false">
  <!-- Header Start -->
  <div slot="a" class="App-header">
    <img alt="ZEA logo" class="App-logo" src="/schwindt.png" />
    <div class="MenuHolder">
      <zea-menu type="dropdown" show-anchor="true">
        <zea-menu-item>
          Tools
          <zea-menu-subitems>
            <zea-menu-item class="MenuItem" hotkey="c" id="camera-manipulator" callback={useCameraManipulator}>Camera Manipulator</zea-menu-item>
            <zea-menu-item class="MenuItem" hotkey="m" id="measurement-tool" callback={useMeasurementTool}>Measurement Tool</zea-menu-item>
          </zea-menu-subitems>
        </zea-menu-item>
      </zea-menu>
    </div>
    <div class="UserChipSetHolder">
      <zea-user-chip-set bind:this={userChipSet} id="zea-user-chip-set" />
    </div>

    <zea-user-chip bind:this={userChip} id="zea-user-chip" />
  </div>
  <!-- Header End -->

  <zea-layout slot="b" cell-a-size="200" cell-b-size="100%" cell-c-size="250" resize-cell-c="false">
    <!-- Sidebar Start -->
    <zea-scroll-pane slot="a">
      <zea-tree-view id="zea-tree-view"></zea-tree-view>
    </zea-scroll-pane>
    <!-- Sidebar Start -->

    <!-- Viewport Start -->
    <canvas bind:this={canvas} slot="b" id="renderer" />
    <!-- Viewport Start -->

    <zea-scroll-pane slot="c">
      <zea-parameter-container bind:this={parameterContainerEl}></zea-parameter-container>
    </zea-scroll-pane>
  </zea-layout>
</zea-layout>
