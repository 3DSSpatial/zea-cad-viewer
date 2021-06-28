<script>
  import LayoutProtected from '../layouts/LayoutProtected.svelte'
</script>

<LayoutProtected>
  <div class="h-full bg-background text-foreground">
    <slot />
  </div>
</LayoutProtected>
