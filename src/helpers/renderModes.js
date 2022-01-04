import { APP_DATA } from '../stores/appData'
import { get } from 'svelte/store'

import {
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
  FlatSurfaceMaterial,
} from '@zeainc/zea-engine'
import { PMIItem } from '@zeainc/zea-cad'

// ////////////////////////////////////////
// Render Modes

const RENDER_MODES = {
  WIREFRAME: 'WIREFRAME',
  FLAT: 'FLAT',
  FLAT_WHITE: 'FLAT_WHITE',
  HIDDEN_LINE: 'HIDDEN_LINE',
  SHADED: 'SHADED',
  SHADED_AND_EDGES: 'SHADED_AND_EDGES',
  PBR: 'PBR',
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
const cacheMaterial = (geomItem) => {
  const geomItemId = geomItem.getId()
  const material = geomItem.materialParam.value
  const materialId = material.getId()
  if (!geomItemToMaterialMapping[geomItemId]) {
    geomItemToMaterialMapping[geomItemId] = materialId
  }
  if (!materials[materialId]) {
    materials[materialId] = {}
    materials[materialId][RENDER_MODES.PBR] = material
  }
}
const createAndAssignMaterial = (geomItem, mode, cb) => {
  const geomItemId = geomItem.getId()
  if (mode != RENDER_MODES.PBR) {
    cacheMaterial(geomItem)
  }
  const materialId = geomItemToMaterialMapping[geomItemId]
  if (!materials[materialId][mode]) {
    // Clone the PBR material and use it as a basis for the new material.
    const newMaterial = materials[materialId][RENDER_MODES.PBR].clone()
    if (cb) cb(newMaterial)
    materials[materialId][mode] = newMaterial
  }
  const result = materials[materialId][mode]
  geomItem.materialParam.setValue(result)
}

const handleChangeRenderModeWireframe = () => {
  if (mode == RENDER_MODES.WIREFRAME) {
    return
  }
  mode = RENDER_MODES.WIREFRAME

  const { assets } = get(APP_DATA)
  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof GeomItem) {
      const geom = item.getParameter('Geometry').value
      if (geom instanceof Mesh || geom instanceof MeshProxy) {
        item.visibleParam.setValue(false)
      }
      createAndAssignMaterial(item, RENDER_MODES.WIREFRAME, (newMaterial) => {
        newMaterial.setName('Wireframe')
      })
    }
  })
}
const handleChangeRenderModeFlatWhite = (pub = true) => {
  if (mode == RENDER_MODES.FLAT_WHITE) {
    return
  }
  mode = RENDER_MODES.FLAT_WHITE
  const { assets, scene, renderer, session } = get(APP_DATA)
  renderer.outlineThickness = 1
  renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)
  const backgroundColor = renderer.getViewport().backgroundColorParam.value
  const whiteMaterial = new FlatSurfaceMaterial()
  whiteMaterial.baseColorParam.value = backgroundColor

  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof GeomItem) {
      const geom = item.geomParam.value
      if (geom instanceof Mesh || geom instanceof MeshProxy) {
        item.visibleParam.value = true
        cacheMaterial(item)
        if (item.materialParam.value.isTransparent()) {
          const currMaterial = item.materialParam.value
          const material = whiteMaterial.clone()
          const baseColor = whiteMaterial.getParameter('BaseColor').value
          baseColor.a = currMaterial.getParameter('BaseColor').value.a
          material.getParameter('BaseColor').value = baseColor
          item.materialParam.setValue(material)
        } else {
          item.materialParam.setValue(whiteMaterial)
        }
      }
    }
  })
  mode = RENDER_MODES.FLAT_WHITE
  if (pub && session) session.pub('setRenderMode', { mode: 'FLAT_WHITE' })
}
const handleChangeRenderModeFlat = () => {
  if (mode == RENDER_MODES.FLAT) {
    return
  }
  mode = RENDER_MODES.FLAT

  const { assets, scene, renderer } = get(APP_DATA)

  renderer.outlineThickness = 1
  renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

  // const backgroundColor = scene
  // .getSettings()
  // .getParameter('BackgroundColor')
  // .value
  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof GeomItem) {
      const geom = item.getParameter('Geometry').value
      if (geom instanceof Mesh || geom instanceof MeshProxy) {
        item.visibleParam.value = true
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

  const { assets, renderer } = get(APP_DATA)

  renderer.outlineThickness = 1
  renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof GeomItem) {
      const geom = item.getParameter('Geometry').value
      if (geom instanceof Mesh || geom instanceof MeshProxy) {
        item.visibleParam.value = true
      }
      createAndAssignMaterial(item, RENDER_MODES.HIDDEN_LINE, (newMaterial) => {
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
      })
    }
  })
  mode = RENDER_MODES.HIDDEN_LINE
}
const handleChangeRenderModeShadedAndEdges = () => {
  if (mode == RENDER_MODES.SHADED_AND_EDGES) {
    return
  }

  const { assets, renderer } = get(APP_DATA)

  renderer.outlineThickness = 1
  renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof GeomItem) {
      const geom = item.getParameter('Geometry').value
      if (geom instanceof Mesh || geom instanceof MeshProxy) {
        item.visibleParam.value = true
      }
      if (geom instanceof Lines || geom instanceof LinesProxy) {
        item.visibleParam.value = true
      }
      createAndAssignMaterial(item, RENDER_MODES.SHADED_AND_EDGES, (newMaterial) => {
        newMaterial.setName('ShadedAndEdges')
        const shaderName = newMaterial.getShaderName()
        if (shaderName == 'LinesShader') {
          if (newMaterial.hasParameter('OccludedStippleValue')) {
            newMaterial.getParameter('OccludedStippleValue').setValue(1)
          }
        } else {
          newMaterial.setShaderName('SimpleSurfaceShader')
          newMaterial.__isTransparent = true
        }
      })
    }
  })
  mode = RENDER_MODES.SHADED_AND_EDGES
}
const handleChangeRenderModePBR = () => {
  if (mode == RENDER_MODES.PBR) {
    return
  }
  const { assets, renderer } = get(APP_DATA)

  renderer.outlineThickness = 1
  renderer.outlineColor = new Color(0.2, 0.2, 0.2, 1)

  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof GeomItem) {
      const geom = item.getParameter('Geometry').value
      if (geom instanceof Mesh || geom instanceof MeshProxy) {
        item.visibleParam.value = true
      }
      if (geom instanceof Lines || geom instanceof LinesProxy) {
        item.visibleParam.value = true
      }
      createAndAssignMaterial(item, RENDER_MODES.PBR)
    }
  })
  mode = RENDER_MODES.PBR
}

const changeRenderMode = (mode) => {
  if (mode === RENDER_MODES.WIREFRAME) {
    handleChangeRenderModeWireframe()
  } else if (mode === RENDER_MODES.FLAT) {
    handleChangeRenderModeFlat()
  } else if (mode === RENDER_MODES.FLAT_WHITE) {
    handleChangeRenderModeFlatWhite()
  } else if (mode === RENDER_MODES.HIDDEN_LINE) {
    handleChangeRenderModeHiddenLine()
  } else if (mode === RENDER_MODES.SHADED) {
    handleChangeRenderModeShadedAndEdges()
  } else if (mode === RENDER_MODES.SHADED_AND_EDGES) {
    handleChangeRenderModeShadedAndEdges()
  } else if (mode === RENDER_MODES.PBR) {
    handleChangeRenderModePBR()
  }
}

export { RENDER_MODES, changeRenderMode }
