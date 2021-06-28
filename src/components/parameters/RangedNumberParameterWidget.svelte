<script>
  export let parameter

  const remap = (value, start1, end1, start2, end2) => {
    return start2 + (end2 - start2) * ((value - start1) / (end1 - start1))
  }
  const round = (n, decimals = 6) =>
    Number(Math.round(Number(`${n}e${decimals}`)) + `e-${decimals}`)

  // Note: Sliders cannot handle fractional values, but we often ned
  // to display sliders that range between 0 ... 1. So we remap
  // the parameter value range to {UI_MIN} ... {UI_MAX} for the slider
  // and display the actual value in the edit box.
  const UI_MIN = 0
  const UI_MAX = 200

  let min = parameter.getRange()[0]
  let max = parameter.getRange()[1]
  let step = parameter.getStep() || remap(1, UI_MIN, UI_MAX, min, max)
  let paramValue = parameter.getValue()
  let sliderValue = Math.round(remap(paramValue, min, max, UI_MIN, UI_MAX))
  let sliderStep = Math.round(remap(step, min, max, UI_MIN, UI_MAX))

  let sliderChanging = false
  const displayValue = () => {
    if (sliderChanging) return
    paramValue = parameter.getValue()
    sliderValue = remap(paramValue, min, max, UI_MIN, UI_MAX)
  }

  const handleSliderChange = (event) => {
    sliderValue = event.target.valueAsNumber
    paramValue = round(
      Math.round(remap(sliderValue, UI_MIN, UI_MAX, min, max) / step) * step
    )

    sliderChanging = true
    parameter.setValue(paramValue)
    sliderChanging = false
  }

  const handleEditChange = (event) => {
    paramValue = event.target.valueAsNumber
    sliderValue = remap(paramValue, min, max, UI_MIN, UI_MAX)

    sliderChanging = true
    parameter.setValue(paramValue)
    sliderChanging = false
  }

  parameter.on('valueChanged', (event) => {
    displayValue()
  })

  parameter.on('rangeChanged', (event) => {
    min = parameter.getMin()
    max = parameter.getMax()
    step = parameter.getStep()
    sliderStep = Math.round(remap(step, min, max, UI_MIN, UI_MAX))
  })
</script>

<input
  max={UI_MAX}
  min={UI_MIN}
  on:input={handleSliderChange}
  type="range"
  step={sliderStep}
  value={sliderValue}
/>
<input
  max={UI_MAX}
  min={UI_MIN}
  on:input={handleEditChange}
  {step}
  type="number"
  value={paramValue}
  class="text-black rounded p-1"
/>
