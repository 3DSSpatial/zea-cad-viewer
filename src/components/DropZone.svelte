<script>
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let files
  export let fileLoaded

  let isDisabled = false

  // Based on this answer: https://stackoverflow.com/a/61417954
  const dragenter = () => {
    // To enable the drop zone to
    if (fileLoaded) {
      isDisabled = false
    }
  }
  document.body.addEventListener('dragover', dragenter)
  document.body.addEventListener('dragenter', dragenter)

  const handleDrop = (ev) => {
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        files = ev.dataTransfer.items[i].getAsFile()
        dispatch('changeFile')
      }
    }
    fileLoaded = true
    isDisabled = true
  }

  const handleSelect = (ev) => {
    for (var i = 0; i < ev.target.files.length; i++) {
      files = ev.target.files[i]
      dispatch('changeFile')
    }
    fileLoaded = true
    isDisabled = true
  }
</script>

<div class="DropZone absolute inset-0 flex" class:pointer-events-none={isDisabled}>
  <input
    accept=".zcad, .gltf, .glb"
    multiple
    on:drop|preventDefault={handleDrop}
    on:change={(e) => {
      handleSelect(e)
    }}
    bind:this={files}
    type="file"
    class="absolute inset-0 z-50 w-full h-full p-0 m-0 outline-none opacity-0"
  />

  {#if !fileLoaded}
    <div
      class="items-center justify-center w-3/12 p-4 py-12 m-auto text-black bg-gray-200 border-2 border-gray-400 rounded-lg h-1/3 bg-opacity-25 hover:bg-blue-200 hover:bg-opacity-25 grid justify-items-center"
    >
      <div class="m-auto">
        <div class="flex flex-col items-center justify-center space-y-2">
          <i class="fas fa-cloud-upload-alt fa-3x text-currentColor" />
          <p class="text-center text-gray-700">Drag your gltf or zcad files here or click in this area.</p>
        </div>
      </div>
    </div>
  {/if}
</div>
