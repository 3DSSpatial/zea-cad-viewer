import { APP_DATA } from '../stores/appData'
import { get } from 'svelte/store'

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

const handleChangeRenderModeWireframe = () => {
  if (mode == RENDER_MODES.WIREFRAME) {
    return
  }
  mode = RENDER_MODES.WIREFRAME

  const { renderer } = get(APP_DATA)
  renderer.renderMode = 'wireframe'
  renderer.requestRedraw()
}
const handleChangeRenderModeFlatWhite = (pub = true) => {
  if (mode == RENDER_MODES.FLAT_WHITE) {
    return
  }
  mode = RENDER_MODES.FLAT_WHITE

  const { renderer } = get(APP_DATA)
  renderer.renderMode = 'hiddenline'
  renderer.hiddenLineColor.a = 0.2
  renderer.requestRedraw()
}
const handleChangeRenderModeFlat = () => {
  if (mode == RENDER_MODES.FLAT) {
    return
  }
  mode = RENDER_MODES.FLAT

  const { renderer } = get(APP_DATA)
  renderer.renderMode = 'flat'
  renderer.hiddenLineColor.a = 0.0
  renderer.requestRedraw()
}
const handleChangeRenderModeHiddenLine = () => {
  if (mode == RENDER_MODES.HIDDEN_LINE) {
    return
  }
  mode = RENDER_MODES.HIDDEN_LINE

  const { renderer } = get(APP_DATA)
  renderer.renderMode = 'flat'
  renderer.hiddenLineColor.r = 1.0
  renderer.hiddenLineColor.a = 0.1
  renderer.requestRedraw()
}
const handleChangeRenderModeShadedAndEdges = () => {
  if (mode == RENDER_MODES.SHADED_AND_EDGES) {
    return
  }

  mode = RENDER_MODES.SHADED_AND_EDGES
  const { renderer } = get(APP_DATA)
  renderer.renderMode = 'hiddenline'
  renderer.hiddenLineColor.a = 0.0
  renderer.requestRedraw()
}
const handleChangeRenderModePBR = () => {
  if (mode == RENDER_MODES.PBR) {
    return
  }
  mode = RENDER_MODES.PBR
  const { renderer } = get(APP_DATA)
  renderer.renderMode = 'pbr'
  renderer.hiddenLineColor.a = 0.0
  renderer.requestRedraw()
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
