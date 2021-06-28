<script>
  export let parameter
  let paramValue = parameter.getValue()

  let changing = false
  const displayValue = () => {
    if (changing) return
    paramValue = parameter.getValue()
  }

  const handleEditChange = (event) => {
    changing = true
    paramValue.setFromHex(event.target.value)
    parameter.setValue(paramValue)
    changing = false
  }

  parameter.on('valueChanged', (event) => {
    displayValue()
  })
</script>

<input
  on:input={handleEditChange}
  type="color"
  value={paramValue.toHex()}
  class="text-black rounded h-full"
/>
