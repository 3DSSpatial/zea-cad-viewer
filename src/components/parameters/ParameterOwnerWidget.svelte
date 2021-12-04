<script>
  import { afterUpdate } from 'svelte'

  export let parameterOwner
  let items = []

  import { componentRegistry } from '../../helpers/componentRegistry.js'

  import BooleanParameterWidget from './BooleanParameterWidget.svelte'
  import NumberParameterWidget from './NumberParameterWidget.svelte'
  import RangedNumberParameterWidget from './RangedNumberParameterWidget.svelte'
  import StringParameterWidget from './StringParameterWidget.svelte'
  import ColorParameterWidget from './ColorParameterWidget.svelte'

  import { BooleanParameter, NumberParameter, StringParameter, ColorParameter } from '@zeainc/zea-engine'

  componentRegistry.registerComponent((parameter) => {
    return parameter instanceof BooleanParameter
  }, BooleanParameterWidget)

  componentRegistry.registerComponent((parameter) => {
    return parameter instanceof NumberParameter
  }, NumberParameterWidget)

  componentRegistry.registerComponent((parameter) => {
    return parameter instanceof NumberParameter && parameter.getRange()
  }, RangedNumberParameterWidget)

  componentRegistry.registerComponent((parameter) => {
    return parameter instanceof StringParameter
  }, StringParameterWidget)

  componentRegistry.registerComponent((parameter) => {
    return parameter instanceof ColorParameter
  }, ColorParameterWidget)

  let index = 0
  $: parameterOwner.getParameters().forEach((parameter) => {
    // The tree view already displays this field
    if (parameter.getName() == 'Visible') return
    // The CADAsset has these properties, but they are not being used
    // and should be removed soon.
    if (parameter.getName() == 'DisplayEdges') return
    // The CADBody has these properties, but they are not being used
    // and should be removed soon.
    if (parameter.getName() == 'Color') return
    if (parameter.getName() == 'EdgeColor') return
    const component = componentRegistry.selectComponent(parameter)
    if (component) {
      items.push({
        index,
        component,
        parameter,
      })
      index++
    }
  })

  afterUpdate(async () => {
    items = []
  })
</script>

<div class="absolute top-0 right-0 p-2 overflow-hidden pointer-events-none ParameterOwnerWidget grid w-120 space-y-2 ">
  {#each items as item (item.index)}
    <div class="flex items-center justify-end mr-2 text-black">
      {item.parameter.getName()}
    </div>
    <div class="pointer-events-auto">
      <svelte:component this={item.component} parameter={item.parameter} />
    </div>
  {/each}
</div>

<style>
  .ParameterOwnerWidget {
    grid-template-columns: 1fr 150px;
  }
</style>
