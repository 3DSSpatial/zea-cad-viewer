<script>
  export let tabs = []
  export let selectedTab = tabs[0]

  const handleClick = (tab) => {
    selectedTab = tab
  }
</script>

<div class="TabsBar flex border-b border-gray-600 mb-2">
  {#each tabs as tab}
    <button
      class="flex-1 leading-9 rounded-t"
      class:bg-gray-600={selectedTab === tab}
      class:bg-gray-800={selectedTab !== tab}
      class:hover:bg-gray-700={selectedTab !== tab}
      class:text-primary={selectedTab === tab}
      on:click={() => {
        handleClick(tab)
      }}
    >
      {tab}
    </button>
  {/each}
</div>
