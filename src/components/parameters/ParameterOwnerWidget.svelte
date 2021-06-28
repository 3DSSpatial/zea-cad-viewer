<script>
  import { onMount, afterUpdate } from 'svelte'
  export let parameterOwner
  let items = []

  import { componentRegistry } from '../../helpers/componentRegistry.js'

  import BooleanParameterWidget from './BooleanParameterWidget.svelte'
  import NumberParameterWidget from './NumberParameterWidget.svelte'
  import RangedNumberParameterWidget from './RangedNumberParameterWidget.svelte'
  import StringParameterWidget from './StringParameterWidget.svelte'
  import ColorParameterWidget from './ColorParameterWidget.svelte'

  const {
    BooleanParameter,
    NumberParameter,
    StringParameter,
    ColorParameter,
  } = window.zeaEngine

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

<div
  class="ParameterOwnerWidget grid grid-cols-2 absolute w-120 top-0 right-0 overflow-hidden pointer-events-none space-y-2 m-2"
>
  {#each items as item (item.index)}
    <div class="text-black">
      {item.parameter.getName()}
    </div>
    <div class="pointer-events-auto">
      <svelte:component this={item.component} parameter={item.parameter} />
    </div>
  {/each}
</div>
