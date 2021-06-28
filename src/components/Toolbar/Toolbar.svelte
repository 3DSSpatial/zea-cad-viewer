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
  import IconRenderModeWireframe from '../icons/IconRenderModeWireframe.svelte'
  import IconRenderModeFlat from '../icons/IconRenderModeFlat.svelte'
  import IconRenderModeShaded from '../icons/IconRenderModeShaded.svelte'
  import IconRenderModeShadedAndEdges from '../icons/IconRenderModeShadedAndEdges.svelte'
  import IconRenderModePBR from '../icons/IconRenderModePBR.svelte'
  import IconRenderModeHiddenLine from '../icons/IconRenderModeHiddenLine.svelte'

  import { APP_DATA } from '../../stores/appData'

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
  // Render Modes

  const RENDER_MODES = {
    WIREFRAME: Symbol(),
    FLAT: Symbol(),
    HIDDEN_LINE: Symbol(),
    SHADED: Symbol(),
    SHADED_AND_EDGES: Symbol(),
    PBR: Symbol(),
  }

  // The default materials are standard shiny surfaces.(PBR)
  let mode = RENDER_MODES.PBR
  // Materials are shared among geom items.
  // We keep track of the material the geom item was using after load.
  // and for each unique material, make a clone and modify it for
  // each render mode.
  const materials = {}

  // The mapping that remembers what material was assigned to the
  // geomItem at load time.
  const geomItemToMaterialMapping = {}
  const createAndAssignMaterial = (geomItem, mode, cb) => {
    const geomItemId = geomItem.getId()
    if (mode != RENDER_MODES.PBR) {
      const material = geomItem.getParameter('Material').getValue()
      const materialId = material.getId()
      if (!geomItemToMaterialMapping[geomItemId]) {
        geomItemToMaterialMapping[geomItemId] = materialId
      }
      if (!materials[materialId]) {
        materials[materialId] = {}
        materials[materialId][RENDER_MODES.PBR] = material
      }
    }
    const materialId = geomItemToMaterialMapping[geomItemId]
    if (!materials[materialId][mode]) {
      // Clone the PBR material and use it as a basis for the new material.
      const newMaterial = materials[materialId][RENDER_MODES.PBR].clone()
      if (cb) cb(newMaterial)
      materials[materialId][mode] = newMaterial
    }
    const result = materials[materialId][mode]
    geomItem.getParameter('Material').setValue(result)
  }
  const handleChangeRenderModeWireframe = () => {
    if (mode == RENDER_MODES.WIREFRAME) {
      return
    }
    mode = RENDER_MODES.WIREFRAME

    const { assets } = $APP_DATA
    assets.traverse((item) => {
      if (item instanceof GeomItem) {
        const geom = item.getParameter('Geometry').getValue()
        if (geom instanceof Mesh || geom instanceof MeshProxy) {
          item.getParameter('Visible').setValue(false)
        }
        createAndAssignMaterial(item, RENDER_MODES.WIREFRAME, (newMaterial) => {
          newMaterial.setName('Wireframe')
        })
      }
    })
  }
  const handleChangeRenderModeFlat = () => {
    if (mode == RENDER_MODES.FLAT) {
      return
    }
    mode = RENDER_MODES.FLAT

    const { assets, scene, renderer } = $APP_DATA

    renderer.outlineThickness = 1
    renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

    // const backgroundColor = scene
    // .getSettings()
    // .getParameter('BackgroundColor')
    // .getValue()
    assets.traverse((item) => {
      if (item instanceof GeomItem) {
        const geom = item.getParameter('Geometry').getValue()
        if (geom instanceof Mesh || geom instanceof MeshProxy) {
          item.getParameter('Visible').setValue(true)
        }
        createAndAssignMaterial(item, RENDER_MODES.FLAT, (newMaterial) => {
          newMaterial.setName('Flat')
          const shaderName = newMaterial.getShaderName()
          if (shaderName == 'LinesShader') {
            if (newMaterial.hasParameter('OccludedStippleValue')) {
              newMaterial.getParameter('OccludedStippleValue').setValue(1)
            }
          } else {
            newMaterial.setShaderName('FlatSurfaceShader')

            // Note: Assigning the background color makes the surfaces
            // blend in with the background. Another option would be to
            // desaturate the current color.
            // newMaterial.getParameter('BaseColor').setValue(backgroundColor)
          }
        })
      }
    })
    mode = RENDER_MODES.FLAT
  }
  const handleChangeRenderModeHiddenLine = () => {
    if (mode == RENDER_MODES.HIDDEN_LINE) {
      return
    }
    mode = RENDER_MODES.HIDDEN_LINE

    const { assets, renderer } = $APP_DATA

    renderer.outlineThickness = 1
    renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

    assets.traverse((item) => {
      if (item instanceof GeomItem) {
        const geom = item.getParameter('Geometry').getValue()
        if (geom instanceof Mesh || geom instanceof MeshProxy) {
          item.getParameter('Visible').setValue(true)
        }
        createAndAssignMaterial(
          item,
          RENDER_MODES.HIDDEN_LINE,
          (newMaterial) => {
            newMaterial.setName('HiddenLine')
            const shaderName = newMaterial.getShaderName()
            if (shaderName == 'LinesShader') {
              if (newMaterial.hasParameter('OccludedStippleValue')) {
                newMaterial.getParameter('StippleScale').setValue(0.02)
                newMaterial.getParameter('StippleValue').setValue(0)
                newMaterial.getParameter('OccludedStippleValue').setValue(0.6)
              }
            } else {
              newMaterial.setShaderName('FlatSurfaceShader')
              // newMaterial.getParameter('BaseColor').setValue(backgroundColor)
            }
          }
        )
      }
    })
    mode = RENDER_MODES.HIDDEN_LINE
  }
  const handleChangeRenderModeShadedAndEdges = () => {
    if (mode == RENDER_MODES.SHADED_AND_EDGES) {
      return
    }

    const { assets, renderer } = $APP_DATA

    renderer.outlineThickness = 1
    renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

    assets.traverse((item) => {
      if (item instanceof GeomItem) {
        const geom = item.getParameter('Geometry').getValue()
        if (geom instanceof Mesh || geom instanceof MeshProxy) {
          item.getParameter('Visible').setValue(true)
        }
        if (geom instanceof Lines || geom instanceof LinesProxy) {
          item.getParameter('Visible').setValue(true)
        }
        createAndAssignMaterial(
          item,
          RENDER_MODES.SHADED_AND_EDGES,
          (newMaterial) => {
            newMaterial.setName('ShadedAndEdges')
            const shaderName = newMaterial.getShaderName()
            if (shaderName == 'LinesShader') {
              if (newMaterial.hasParameter('OccludedStippleValue')) {
                newMaterial.getParameter('OccludedStippleValue').setValue(1)
              }
            } else {
              newMaterial.setShaderName('SimpleSurfaceShader')
            }
          }
        )
      }
    })
    mode = RENDER_MODES.SHADED_AND_EDGES
  }
  const handleChangeRenderModePBR = () => {
    if (mode == RENDER_MODES.PBR) {
      return
    }
    const { assets, renderer } = $APP_DATA

    renderer.outlineThickness = 1
    renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

    assets.traverse((item) => {
      if (item instanceof GeomItem) {
        const geom = item.getParameter('Geometry').getValue()
        if (geom instanceof Mesh || geom instanceof MeshProxy) {
          item.getParameter('Visible').setValue(true)
        }
        if (geom instanceof Lines || geom instanceof LinesProxy) {
          item.getParameter('Visible').setValue(true)
        }
        createAndAssignMaterial(item, RENDER_MODES.PBR)
      }
    })
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
