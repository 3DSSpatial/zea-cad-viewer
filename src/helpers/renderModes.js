import { APP_DATA } from '../stores/appData'
import { get } from 'svelte/store'

import { GeomItem, Mesh, MeshProxy, Lines, LinesProxy, Color, PMIItem, CADAsset } from '@zeainc/zea-engine'

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
const materialCache = {}

const resetMaterial = (material) => {
  if (!materialCache[material.getId()]) {
    const values = {}
    if (material.hasParameter('BaseColor')) values.BaseColor = material.getParameter('BaseColor').value.clone()
    if (material.hasParameter('Reflectance')) values.Reflectance = material.getParameter('Reflectance').value
    if (material.hasParameter('EmissiveStrength'))
      values.EmissiveStrength = material.getParameter('EmissiveStrength').value
    materialCache[material.getId()] = values
  } else {
    const values = materialCache[material.getId()]
    material.getParameter('BaseColor').value = values.BaseColor.clone()
    if (material.hasParameter('Reflectance')) material.getParameter('Reflectance').value = values.Reflectance
    if (material.hasParameter('EmissiveStrength'))
      material.getParameter('EmissiveStrength').value = values.EmissiveStrength
  }
}

const handleChangeRenderModeWireframe = () => {
  if (mode == RENDER_MODES.WIREFRAME) {
    return
  }
  mode = RENDER_MODES.WIREFRAME

  const { assets } = get(APP_DATA)

  const processed = {}
  const modifyMaterial = (material) => {
    if (material.getShaderName() == 'StandardSurfaceShader') {
      if (processed[material.getId()]) return
      processed[material.getId()] = true
      resetMaterial(material)

      material.getParameter('BaseColor').value.a = 0
      if (material.hasParameter('Reflectance')) material.getParameter('Reflectance').value = 0
      if (material.hasParameter('EmissiveStrength')) material.getParameter('EmissiveStrength').value = 1
    }
  }

  assets.traverse((item) => {
    if (item instanceof PMIItem) return false

    if (item instanceof CADAsset) {
      const materialLibrary = item.materialLibrary
      const materials = materialLibrary.getMaterials()
      materials.forEach((material) => {
        modifyMaterial(material)
      })
    }
    if (item instanceof GeomItem) {
      const material = item.materialParam.value
      modifyMaterial(material)
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

  const processed = {}
  const modifyMaterial = (material) => {
    if (material.getShaderName() == 'StandardSurfaceShader') {
      if (processed[material.getId()]) return
      processed[material.getId()] = true
      resetMaterial(material)
      material.getParameter('BaseColor').value = backgroundColor
      if (material.hasParameter('Reflectance')) material.getParameter('Reflectance').value = 0
      if (material.hasParameter('EmissiveStrength')) material.getParameter('EmissiveStrength').value = 1
    }
  }
  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof CADAsset) {
      const materialLibrary = item.materialLibrary
      const materials = materialLibrary.getMaterials()
      materials.forEach((material) => {
        modifyMaterial(material)
      })
    }
    if (item instanceof GeomItem) {
      const material = item.materialParam.value
      modifyMaterial(material)
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

  const processed = {}
  const modifyMaterial = (material) => {
    if (material.getShaderName() == 'StandardSurfaceShader') {
      if (processed[material.getId()]) return
      processed[material.getId()] = true
      resetMaterial(material)
      if (material.hasParameter('Reflectance')) material.getParameter('Reflectance').value = 0
      if (material.hasParameter('EmissiveStrength')) material.getParameter('EmissiveStrength').value = 1
    }
  }
  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof CADAsset) {
      const materialLibrary = item.materialLibrary
      const materials = materialLibrary.getMaterials()
      materials.forEach((material) => {
        if (material.getShaderName() == 'StandardSurfaceShader') {
          modifyMaterial(material)
        }
      })
    }
    if (item instanceof GeomItem) {
      const material = item.materialParam.value
      modifyMaterial(material)
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

  const processed = {}
  const modifyMaterial = (material) => {
    if (processed[material.getId()]) return
    processed[material.getId()] = true
    resetMaterial(material)
    if (material.getShaderName() == 'StandardSurfaceShader') {
      material.getParameter('BaseColor').value = backgroundColor
      if (material.hasParameter('Reflectance')) material.getParameter('Reflectance').value = 0
      if (material.hasParameter('EmissiveStrength')) material.getParameter('EmissiveStrength').value = 1
    }
  }
  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof CADAsset) {
      const materialLibrary = item.materialLibrary
      const materials = materialLibrary.getMaterials()
      materials.forEach((material) => {
        if (material.getShaderName() == 'StandardSurfaceShader') {
          modifyMaterial(material)
        }
      })
    }
    if (item instanceof GeomItem) {
      const material = item.materialParam.value
      modifyMaterial(material)
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
    if (item instanceof CADAsset) {
      const materialLibrary = item.materialLibrary
      const materials = materialLibrary.getMaterials()
      materials.forEach((material) => {
        if (material.getShaderName() == 'StandardSurfaceShader') {
          modifyMaterial(material)
        }
      })
    }
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

  const processed = {}
  const modifyMaterial = (material) => {
    if (processed[material.getId()]) return
    processed[material.getId()] = true
    resetMaterial(material)
  }
  assets.traverse((item) => {
    if (item instanceof PMIItem) return false
    if (item instanceof CADAsset) {
      const materialLibrary = item.materialLibrary
      const materials = materialLibrary.getMaterials()
      materials.forEach((material) => {
        if (material.getShaderName() == 'StandardSurfaceShader') {
          modifyMaterial(material)
        }
      })
    }
    if (item instanceof GeomItem) {
      const material = item.materialParam.value
      modifyMaterial(material)
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
