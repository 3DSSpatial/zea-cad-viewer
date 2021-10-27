<script>
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let files
  export let fileLoaded

  $: if (fileLoaded) {
    const div = document.getElementById('fileDropZone')
    div.classList.add('pointer-events-none')
  }

  // Based on this answer: https://stackoverflow.com/a/61417954
  const dragenter = () => {
    // To enable the drop zone to
    if (fileLoaded) {
      const div = document.getElementById('fileDropZone')
      div.classList.remove('pointer-events-none')
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
    const div = document.getElementById('fileDropZone')
    div.classList.add('pointer-events-none')
  }
  const handleSelect = (ev) => {
    for (var i = 0; i < ev.target.files.length; i++) {
      files = ev.target.files[i]
      dispatch('changeFile')
    }
    fileLoaded = true
    const div = document.getElementById('fileDropZone')
    div.classList.add('pointer-events-none')
  }
</script>

<div id="fileDropZone" class="fixed w-full flex h-screen">
  <input
    accept=".zcad, .gltf, .glb"
    multiple
    on:drop|preventDefault={handleDrop}
    on:change={(e) => {
      handleSelect(e)
    }}
    bind:this={files}
    type="file"
    class="absolute inset-0 z-50 m-0 p-0 w-full h-full outline-none opacity-0"
  />
  {#if !fileLoaded}
    <div
      class="border-2 border-gray-400 py-12 justify-center items-center p-4 m-auto rounded-lg w-3/12 h-1/3 bg-gray-200 bg-opacity-25 hover:bg-blue-200 hover:bg-opacity-25 text-black grid justify-items-center"
    >
      <div class="m-auto">
        <div class="flex flex-col space-y-2 items-center justify-center">
          <i class="fas fa-cloud-upload-alt fa-3x text-currentColor" />
          <p class="text-gray-700 text-center">Drag your gltf or zcad files here or click in this area.</p>
        </div>
      </div>
    </div>
  {/if}
</div>
