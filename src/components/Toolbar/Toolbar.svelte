<script>
  import { onMount } from 'svelte'
  export let orientation = 'horizontal'

  import ToolbarItem from './ToolbarItem.svelte'
  import ToolbarItemPopup from './ToolbarItemPopup.svelte'

  import IconMeasureDistance from '../icons/IconMeasureDistance.svelte'
  import IconMeasureAngle from '../icons/IconMeasureAngle.svelte'
  import IconMeasureCenterDistance from '../icons/IconMeasureCenterDistance.svelte'
  import IconMeasureRadius from '../icons/IconMeasureRadius.svelte'

  import IconRenderModeWireframe from '../icons/IconRenderModeWireframe.svelte'
  import IconRenderModeFlat from '../icons/IconRenderModeFlat.svelte'
  import IconRenderModeFlatWhite from '../icons/IconRenderModeFlatWhite.svelte'
  import IconRenderModeShaded from '../icons/IconRenderModeShaded.svelte'
  import IconRenderModeShadedAndEdges from '../icons/IconRenderModeShadedAndEdges.svelte'
  import IconRenderModePBR from '../icons/IconRenderModePBR.svelte'
  import IconRenderModeHiddenLine from '../icons/IconRenderModeHiddenLine.svelte'

  import { RENDER_MODES, changeRenderMode } from '../../helpers/renderModes'
  import { MEASURE_TOOLS, toggleMeasureTool } from '../../helpers/measureTools'

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
  const handleChangeRenderModeFlatWhite = () => {
    changeRenderMode(RENDER_MODES.FLAT_WHITE)
    mode = RENDER_MODES.FLAT_WHITE
  }
  const handleChangeRenderModeHiddenLine = () => {
    changeRenderMode(RENDER_MODES.HIDDEN_LINE)
    mode = RENDER_MODES.HIDDEN_LINE
  }
  // const handleChangeRenderModeShadedAndEdges = () => {
  //   changeRenderMode(RENDER_MODES.SHADED_AND_EDGES)
  //   mode = RENDER_MODES.SHADED_AND_EDGES
  // }
  const handleChangeRenderModePBR = () => {
    changeRenderMode(RENDER_MODES.PBR)
    mode = RENDER_MODES.PBR
  }
</script>

<div class="Toolbar flex gap-1" class:flex-col={orientation === 'vertical'}>
  <ToolbarItemPopup isHighlighted={measureTool !== MEASURE_TOOLS.NONE} title="Measure Tools">
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
  <ToolbarItemPopup isHighlighted={mode !== RENDER_MODES.PBR} title="Renderer modes">
    <IconRenderModeShadedAndEdges />

    <div class="flex flex-col absolute bottom-full gap-1 mb-1" slot="popup">
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.WIREFRAME}
        title="Wireframe"
        on:click={handleChangeRenderModeWireframe}
      >
        <IconRenderModeWireframe />
      </ToolbarItem>
      <ToolbarItem isHighlighted={mode === RENDER_MODES.FLAT} title="Flat" on:click={handleChangeRenderModeFlat}>
        <IconRenderModeFlat />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.FLAT_WHITE}
        title="FlatWhite"
        on:click={handleChangeRenderModeFlatWhite}
      >
        <IconRenderModeFlatWhite />
      </ToolbarItem>
      <ToolbarItem
        isHighlighted={mode === RENDER_MODES.HIDDEN_LINE}
        title="HiddenLine"
        on:click={handleChangeRenderModeHiddenLine}
      >
        <IconRenderModeHiddenLine />
      </ToolbarItem>
      <!-- <ToolbarItem
        isHighlighted={mode === RENDER_MODES.SHADED_AND_EDGES}
        title="ShadedAndEdges"
        on:click={handleChangeRenderModeShadedAndEdges}
      >
        <IconRenderModeShadedAndEdges />
      </ToolbarItem> -->
      <ToolbarItem isHighlighted={mode === RENDER_MODES.PBR} title="PBR" on:click={handleChangeRenderModePBR}>
        <IconRenderModePBR />
      </ToolbarItem>
    </div>
  </ToolbarItemPopup>
</div>
