<script>
  import SplitPane from '../components/SplitPane.svelte'
  import Pane from '../components/Pane.svelte'
</script>

<div class="m-3">
  <h1 class="mb-3 text-2xl">Examples</h1>

  <ul class="underline text-blue-500">
    <li>
      <a
        class="hover:text-blue-400"
        href="/login?zcad=/data/gear_box_final_asm-visu.zcad"
      >
        gear_box_final_asm-visu.zcad
      </a>
    </li>
    <li>
      <a
        class="hover:text-blue-400"
        href="/login?zcad=/data/Hospital/Autodesk_Hospital_HVAC.zcad"
      >
        Autodesk_Hospital_HVAC.zcad
      </a>
    </li>
    <li>
      <a
        class="hover:text-blue-400"
        href="/login?zcad=/data/Hospital/Autodesk_Hospital_Structural.zcad"
      >
        Autodesk_Hospital_Structural.zcad
      </a>
    </li>
  </ul>
</div>
