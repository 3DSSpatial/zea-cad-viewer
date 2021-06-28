<script lang="ts">
  import { redirect } from '@roxi/routify'

  import SplashScreen from '../../components/SplashScreen.svelte'

  import { authClient } from '../../stores/auth'

  $: if ($authClient) {
    const query = window.location.search

    if (query.includes('code=') && query.includes('state=')) {
      $authClient.handleRedirectCallback().then(() => {
        $redirect('/')
      })
    }
  }
</script>

<SplashScreen />
