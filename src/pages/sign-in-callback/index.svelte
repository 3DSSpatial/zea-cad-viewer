<script lang="ts">
  import { redirect } from '@roxi/routify'

  import SplashScreen from '../../components/SplashScreen.svelte'

  import { authClient } from '../../stores/auth'

  $: if ($authClient) {
    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.has('code') && urlParams.has('state')) {
      $authClient.handleRedirectCallback().then(() => {
        urlParams.delete('code')
        urlParams.delete('state')

        $redirect(`/?${urlParams.toString()}`)
      })
    }
  }
</script>

<SplashScreen />
