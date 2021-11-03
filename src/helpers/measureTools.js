import { APP_DATA } from '../stores/appData'
import { get } from 'svelte/store'

import { MeasureDistanceTool, MeasureRadiusTool, MeasureAngleTool, MeasureCenterDistancesTool } from '@zeainc/zea-ux'

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

const toggleMeasureTool = (index) => {
  if (mode == index) {
    if (index != MEASURE_TOOLS.NONE) return toggleMeasureTool(MEASURE_TOOLS.NONE)
  }

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

export { MEASURE_TOOLS, toggleMeasureTool, setupMeasurementTools }
