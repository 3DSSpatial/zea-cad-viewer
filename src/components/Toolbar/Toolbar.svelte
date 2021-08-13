<script>
  export let orientation = 'horizontal'

  import ToolbarItem from './ToolbarItem.svelte'
  import ToolbarItemPopup from './ToolbarItemPopup.svelte'

  import IconFrontView from '../icons/IconFrontView.svelte'
  import IconBackView from '../icons/IconBackView.svelte'
  import IconTopView from '../icons/IconTopView.svelte'
  import IconBottomView from '../icons/IconBottomView.svelte'
  import IconLeftView from '../icons/IconLeftView.svelte'
  import IconRightView from '../icons/IconRightView.svelte'
  import IconPerspView from '../icons/IconPerspView.svelte'

  import IconMeasureDistance from '../icons/IconMeasureDistance.svelte'
  import IconMeasureAngle from '../icons/IconMeasureAngle.svelte'
  import IconMeasureCenterDistance from '../icons/IconMeasureCenterDistance.svelte'
  import IconMeasureRadius from '../icons/IconMeasureRadius.svelte'

  import IconRenderModeWireframe from '../icons/IconRenderModeWireframe.svelte'
  import IconRenderModeFlat from '../icons/IconRenderModeFlat.svelte'
  import IconRenderModeShaded from '../icons/IconRenderModeShaded.svelte'
  import IconRenderModeShadedAndEdges from '../icons/IconRenderModeShadedAndEdges.svelte'
  import IconRenderModePBR from '../icons/IconRenderModePBR.svelte'
  import IconRenderModeHiddenLine from '../icons/IconRenderModeHiddenLine.svelte'

  import { APP_DATA } from '../../stores/appData'
  import { RENDER_MODES, changeRenderMode } from '../../helpers/renderModes'
  import { MEASURE_TOOLS, toggleMeasureTool } from '../../helpers/measureTools'

  const {
    Vec3,
    Xfo,
    Mat3,
    GeomItem,
    Mesh,
    MeshProxy,
    Lines,
    LinesProxy,
    Color,
    Quat,
    MathFunctions,
  } = window.zeaEngine

  const setCameraXfo = (camera, dir, up, duration = 400) => {
    const { renderer } = $APP_DATA
    const startTarget = camera.getTargetPosition()
    const startDist = camera.getFocalDistance()

    const startXfo = camera.getParameter('GlobalXfo').getValue()

    // Calculate the target orientation of the camera.
    const sw = dir.cross(up).normalize()
    const upNormalized = sw.cross(dir).normalize()
    const mat3 = new Mat3(sw, upNormalized, dir.negate())
    const endOri = new Quat()
    endOri.setFromMat3(mat3)
    endOri.alignWith(startXfo.ori)

    const xfo = new Xfo()
    xfo.ori = endOri
    camera.getParameter('GlobalXfo').setValue(xfo)
    // Now to calculate where the camera will end up at the end
    // after framing, we set the camera Xfo, call frameAll,
    // extract the target, and then put back the old value so we can
    // start interpolating.
    renderer.frameAll()
    const endTarget = camera.getTargetPosition()
    const endDist = camera.getFocalDistance()
    camera.getParameter('GlobalXfo').setValue(startXfo)

    const count = Math.round(duration / 20) // each step is 20ms
    let id
    let i = 0
    const applyMovement = () => {
      const lerpValue = i / count

      // interpolate the orientation between the start and the end ones.
      const xfo = new Xfo()
      xfo.ori = startXfo.ori.lerp(endOri, lerpValue).normalize()

      // interpolate the target and distance between the start and the end ones.
      const target = startTarget.lerp(endTarget, lerpValue)
      const dist = MathFunctions.lerp(startDist, endDist, lerpValue)

      // Move the camera back away from the new target using the orientation.
      const newDir = xfo.ori.getZaxis().negate()
      xfo.tr = target.subtract(newDir.scale(dist))

      camera.getParameter('GlobalXfo').setValue(xfo)
      i++
      if (i <= count) {
        id = setTimeout(applyMovement, 20)
      } else {
        //renderer.frameAll()
        // Thie event tells the viewport to re-rendeer the picking buffer.
        camera.emit('movementFinished')
      }
    }
    applyMovement()
  }

  /* {{{ View handlers. */
  const handleChangeViewFront = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    setCameraXfo(camera, new Vec3(0, 1, 0), new Vec3(0, 0, 1))
    // camera.setIsOrthographic(1.0)
  }
  const handleChangeViewBack = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    setCameraXfo(camera, new Vec3(0, -1, 0), new Vec3(0, 0, 1))
    // camera.setIsOrthographic(1.0)
  }
  const handleChangeViewTop = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    setCameraXfo(camera, new Vec3(0, 0, -1), new Vec3(0, 1, 0))
    // camera.setIsOrthographic(1.0)
  }
  const handleChangeViewBottom = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    setCameraXfo(camera, new Vec3(0, 0, 1), new Vec3(0, -1, 0))
    // camera.setIsOrthographic(1.0)
  }
  const handleChangeViewLeft = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    setCameraXfo(camera, new Vec3(1, 0, 0), new Vec3(0, 0, 1))
    // camera.setIsOrthographic(1.0)
  }
  const handleChangeViewRight = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    setCameraXfo(camera, new Vec3(-1, 0, 0), new Vec3(0, 0, 1))
    // camera.setIsOrthographic(1.0)
  }
  const handleChangeViewPerspective = () => {
    const { renderer } = $APP_DATA
    const camera = renderer.getViewport().getCamera()
    const dir = new Vec3(-1, 1, -1)
    dir.normalizeInPlace()
    setCameraXfo(camera, dir, new Vec3(0, 0, 1))
    camera.setIsOrthographic(0.0)
  }
  /* }}} View handlers. */

  // ////////////////////////////////////////
  // Measure Tools
  let measureTool = MEASURE_TOOLS.NONE
  const handleChangeToolMEASURE_DISTANCE = () => {
    measureTool = toggleMeasureTool(MEASURE_TOOLS.MEASURE_DISTANCE)
  }
  const handleChangeToolMEASURE_RADIUS = () => {
    measureTool = toggleMeasureTool(MEASURE_TOOLS.MEASURE_RADIUS)
  }
  const handleChangeToolMEASURE_CENTER_DISTANCE = () => {
    measureTool = toggleMeasureTool(MEASURE_TOOLS.MEASURE_CENTER_DISTANCE)
  }
  const handleChangeToolMEASURE_ANGLE = () => {
    measureTool = toggleMeasureTool(MEASURE_TOOLS.MEASURE_ANGLE)
  }

  // ////////////////////////////////////////
  // Render Modes
  // The default materials are standard shiny surfaces.(PBR)
  let mode = RENDER_MODES.PBR
  const handleChangeRenderModeWireframe = () => {
    changeRenderMode(RENDER_MODES.WIREFRAME)
    mode = RENDER_MODES.WIREFRAME
  }
  const handleChangeRenderModeFlat = () => {
    changeRenderMode(RENDER_MODES.FLAT)
    mode = RENDER_MODES.FLAT
  }
  const handleChangeRenderModeHiddenLine = () => {
    changeRenderMode(RENDER_MODES.HIDDEN_LINE)
    mode = RENDER_MODES.HIDDEN_LINE
  }
  const handleChangeRenderModeShadedAndEdges = () => {
    changeRenderMode(RENDER_MODES.SHADED_AND_EDGES)
    mode = RENDER_MODES.SHADED_AND_EDGES
  }
  const handleChangeRenderModePBR = () => {
    changeRenderMode(RENDER_MODES.PBR)
    mode = RENDER_MODES.PBR
  }
</script>

<div class="Toolbar flex gap-1" class:flex-col={orientation === 'vertical'}>
  <ToolbarItem title="Front" on:click={handleChangeViewFront}>
    <IconFrontView />
  </ToolbarItem>
  <ToolbarItem title="Back" on:click={handleChangeViewBack}>
    <IconBackView />
  </ToolbarItem>
  <ToolbarItem title="Top" on:click={handleChangeViewTop}>
    <IconTopView />
  </ToolbarItem>
  <ToolbarItem title="Bottom" on:click={handleChangeViewBottom}>
    <IconBottomView />
  </ToolbarItem>
  <ToolbarItem title="Left" on:click={handleChangeViewLeft}>
    <IconLeftView />
  </ToolbarItem>
  <ToolbarItem title="Right" on:click={handleChangeViewRight}>
    <IconRightView />
  </ToolbarItem>
  <ToolbarItem title="Perspective" on:click={handleChangeViewPerspective}>
    <IconPerspView />
  </ToolbarItem>

  <ToolbarItemPopup
    isHighlighted={measureTool !== MEASURE_TOOLS.NONE}
    title="Measure Tools"
  >
    <IconMeasureDistance />
    <div class="flex flex-col absolute bottom-full gap-1 mb-1" slot="popup">
      <ToolbarItem
        isHighlighted={measureTool === MEASURE_TOOLS.MEASURE_DISTANCE}
        title="MEASURE_DISTANCE"
        on:click={handleChangeToolMEASURE_DISTANCE}
      >
        <IconMeasureDistance />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={measureTool === MEASURE_TOOLS.MEASURE_RADIUS}
        title="MEASURE_RADIUS"
        on:click={handleChangeToolMEASURE_RADIUS}
      >
        <IconMeasureRadius />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={measureTool === MEASURE_TOOLS.MEASURE_CENTER_DISTANCE}
        title="MEASURE_CENTER_DISTANCE"
        on:click={handleChangeToolMEASURE_CENTER_DISTANCE}
      >
        <IconMeasureCenterDistance />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={measureTool === MEASURE_TOOLS.MEASURE_ANGLE}
        title="MEASURE_ANGLE"
        on:click={handleChangeToolMEASURE_ANGLE}
      >
        <IconMeasureAngle />
      </ToolbarItem>
    </div>
  </ToolbarItemPopup>
  <ToolbarItemPopup
    isHighlighted={mode !== RENDER_MODES.PBR}
    title="Renderer modes"
  >
    <IconRenderModeWireframe />
    <div class="flex flex-col absolute bottom-full gap-1 mb-1" slot="popup">
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.WIREFRAME}
        title="Wireframe"
        on:click={handleChangeRenderModeWireframe}
      >
        <IconRenderModeWireframe />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.FLAT}
        title="Flat"
        on:click={handleChangeRenderModeFlat}
      >
        <IconRenderModeFlat />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.HIDDEN_LINE}
        title="HiddenLine"
        on:click={handleChangeRenderModeHiddenLine}
      >
        <IconRenderModeHiddenLine />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.SHADED_AND_EDGES}
        title="ShadedAndEdges"
        on:click={handleChangeRenderModeShadedAndEdges}
      >
        <IconRenderModeShadedAndEdges />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.PBR}
        title="PBR"
        on:click={handleChangeRenderModePBR}
      >
        <IconRenderModePBR />
      </ToolbarItem>
    </div>
  </ToolbarItemPopup>
</div>
