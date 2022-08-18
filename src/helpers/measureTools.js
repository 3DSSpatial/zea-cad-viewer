import { APP_DATA } from '../stores/appData'
import { get } from 'svelte/store'

import { MeasureDistanceTool, MeasureRadiusTool, MeasureAngleTool, MeasureCenterDistancesTool } from '@zeainc/zea-ux'
import { CADAsset } from '@zeainc/zea-engine'

// ////////////////////////////////////////
// Render Modes

const MEASURE_TOOLS = {
  NONE: Symbol(),
  MEASURE_DISTANCE: Symbol(),
  MEASURE_RADIUS: Symbol(),
  MEASURE_CENTER_DISTANCE: Symbol(),
  MEASURE_ANGLE: Symbol(),
}

let mode = MEASURE_TOOLS.NONE

const setupMeasurementTools = (toolManager, appData) => {
  const { renderer } = appData
  const measureDistanceTool = new MeasureDistanceTool(appData)
  const measureRadiusTool = new MeasureRadiusTool(appData)
  const measureAngleTool = new MeasureAngleTool(appData)
  const measureCenterDistancesTool = new MeasureCenterDistancesTool(appData)

  const cameraManipulator = renderer.getViewport().getManipulator()
  toolManager.registerTool('cameraManipulator', cameraManipulator)
  toolManager.registerTool('measureDistanceTool', measureDistanceTool)
  toolManager.registerTool('measureRadiusTool', measureRadiusTool)
  toolManager.registerTool('measureAngleTool', measureAngleTool)
  toolManager.registerTool('measureCenterDistancesTool', measureCenterDistancesTool)
}

const pushTool = (index) => {
  const { toolManager } = get(APP_DATA)
  if (mode == MEASURE_TOOLS.NONE) {
  } else if (mode == MEASURE_TOOLS.MEASURE_DISTANCE) {
    toolManager.popTool()
  } else if (mode == MEASURE_TOOLS.MEASURE_RADIUS) {
    toolManager.popTool()
  } else if (mode == MEASURE_TOOLS.MEASURE_CENTER_DISTANCE) {
    toolManager.popTool()
  } else if (mode == MEASURE_TOOLS.MEASURE_ANGLE) {
    toolManager.popTool()
  }

  if (index == MEASURE_TOOLS.NONE) {
  } else if (index == MEASURE_TOOLS.MEASURE_DISTANCE) {
    toolManager.pushTool('measureDistanceTool')
  } else if (index == MEASURE_TOOLS.MEASURE_RADIUS) {
    toolManager.pushTool('measureRadiusTool')
  } else if (index == MEASURE_TOOLS.MEASURE_CENTER_DISTANCE) {
    toolManager.pushTool('measureCenterDistancesTool')
  } else if (index == MEASURE_TOOLS.MEASURE_ANGLE) {
    toolManager.pushTool('measureAngleTool')
  }
  mode = index
  return mode
}

const pickMetadataFile = () => {
  return new Promise((resolve) => {
    let input = document.createElement('input')
    input.addEventListener('change', (e) => {
      const url = URL.createObjectURL(e.target.files[0])
      resolve(url)
    })
    input.setAttribute('type', 'file')
    input.setAttribute('accept', '.zmetadata')
    input.click()
  })
}

const toggleMeasureTool = (index) => {
  if (mode == index) {
    if (index != MEASURE_TOOLS.NONE) return toggleMeasureTool(MEASURE_TOOLS.NONE)
  }
  console.log('toggleMeasureTool')
  const { scene } = get(APP_DATA)
  let assetItem
  scene.getRoot().traverse((item) => {
    if (assetItem) return false
    if (item instanceof CADAsset) {
      assetItem = item
      return false
    }
  })
  console.log('assetItem:', assetItem)
  if (!assetItem) return

  if (assetItem.getEngineDataVersion().compare([3, 9, 1]) >= 0) {
    if (assetItem.url.startsWith('blob')) {
      if (!assetItem.metadataLoaded) {
        pickMetadataFile().then((metaDataUrl) => {
          assetItem
            .loadMetadata(metaDataUrl)
            .then(() => {
              // @ts-ignore
              pushTool(index)
            })
            .catch((err) => {
              console.error(err)
            })
        })
      } else {
        pushTool(index)
      }
      return
    }
    assetItem
      .loadMetadata()
      .then(() => {
        // @ts-ignore
        pushTool(index)
      })
      .catch((err) => {
        console.error(err)
      })
  } else {
    pushTool(index)
  }
}

export { MEASURE_TOOLS, toggleMeasureTool, setupMeasurementTools }
