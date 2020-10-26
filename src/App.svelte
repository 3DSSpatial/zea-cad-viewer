<script>
  import { onMount } from 'svelte'

  import { getRamdomUser, getAppData } from './helpers/helpers.js'

  const { Session, SessionSync } = window.zeaCollab

  let canvas
  let userChip
  let userChipSet

  onMount(async () => {
    const appData = getAppData(canvas)

    const userData = await getRamdomUser()

    const socketUrl = 'https://websocket-staging.zea.live'
    const session = new Session(userData, socketUrl)
    session.joinRoom('zea-template-svelte')

    const sessionSync = new SessionSync(session, appData, userData, {})

    userChipSet.session = session

    userChip.userData = userData
  })
</script>

<zea-layout
  orientation="vertical"
  cell-a-size="50"
  resize-cell-a="false"
  cell-b-size="100%"
  cell-c-size="0px"
  resize-cell-c="false"
>
  <div slot="a" class="App-header">
    <img
      alt="ZEA logo"
      class="App-logo"
      src="https://cdn.glitch.com/902123f3-ae96-4804-b014-ff54744cf91a%2Flogo-zea.svg?v=1600384733817"
    />
    <div class="UserChipSetHolder">
      <zea-user-chip-set bind:this={userChipSet} id="zea-user-chip-set" />
    </div>
    <zea-user-chip bind:this={userChip} id="zea-user-chip" />
  </div>
  <zea-layout
    slot="b"
    cell-a-size="0px"
    cell-b-size="100%"
    cell-c-size="0px"
    resize-cell-c="false"
  >
    <canvas bind:this={canvas} slot="b" id="renderer" />
  </zea-layout>
</zea-layout>
