<script>
  export let parameter
  let items = []
  let paramValue = parameter.getValue()

  function lines(text) {  
  return text.split('\n\t')
}
  if( parameter.getName().startsWith("MaterialDefinition") ) {
      const text = paramValue.split('\n')
      for (const x of text) {
        x.trim('\n')
        console.log(`push paramater name = ${x}`)
        x .length && items.push(x.trim('\t') ) 
      }
  }

  let changing = false
  const displayValue = () => {
    if (changing) return
  }

  const handleEditChange = (event) => {
    paramValue = event.target.value
    changing = true
    parameter.setValue(paramValue)
    changing = false
  }

  parameter.on('valueChanged', (event) => {
    displayValue()
  })
</script>

{#if !items.length}
  <input
  on:input={handleEditChange}
  value={paramValue}
  readonly
  class="StringParameterWidget text-black rounded p-1 w-full"
  />
{/if}
{#if items.length}
  {#each items as item ,i}
    <input
      on:input={handleEditChange}
      value={item}
      readonly
      class="StringParameterWidget text-black rounded p-1 w-full"
    />
  {/each}
{/if}

