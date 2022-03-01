<script>
  import { beforeUpdate } from 'svelte'
  // A dialog based on 'svelte-accessible-dialog'
  // https://www.npmjs.com/package/svelte-accessible-dialog
  import { DialogOverlay, DialogContent } from 'svelte-accessible-dialog'
  import { APP_DATA } from '../stores/appData'
  import { collectSceneStats } from '../stores/sceneStats'

  export let isOpen
  export let close
  let sceneStats
  beforeUpdate(() => {
    if (isOpen) {
      const { assets } = $APP_DATA
      sceneStats = collectSceneStats(assets)
    }
  })
</script>

<DialogOverlay {isOpen} onDismiss={close} class="overlay">
  <DialogContent class="content">
    <section class="p-2">
      <header>Scene Stats</header>
      <main>
        <pre
          class="text-gray-100 my-3 py-3">
Assemblies:{sceneStats.ASSEMBLIES}
Parts:{sceneStats.PARTS}
Bodies:{sceneStats.BODIES}
Geometries:{sceneStats.GEOMS}
Triangles:{sceneStats.TRIANGLES}
Lines:{sceneStats.LINES}
        </pre>
      </main>
      <div class="text-right">
        <button on:click={close} class="bg-gray-700 border rounded px-2 text-white"> Close </button>
      </div>
    </section>
  </DialogContent>
</DialogOverlay>

<style>
  :global([data-svelte-dialog-overlay].overlay) {
    z-index: 10;
  }

  :global([data-svelte-dialog-content].content) {
    border: 1px solid #000;
    padding: 1rem;
    background: var(--color-background-1);
    color: var(--color-foreground-2);
  }

  section {
    border: 1px solid #0003;
    box-shadow: 2px 2px 5px 0px #0002;
  }
</style>
