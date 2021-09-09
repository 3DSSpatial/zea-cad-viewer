<script>
  import { redirect } from '@roxi/routify'

  // import SplashScreen from '../components/SplashScreen.svelte'
  // import { authClient, currentUser } from '../stores/auth'
  const urlParams = new URLSearchParams(window.location.search)

  // Note: PT 09-09-2021: We are disabling all authentication in the zea-cad-viewer
  // as we are not supporting collaboration, as this app is intended to be integrated
  // into a client application. I believe a better solution would be to remove the 'LayoutProtected'
  // component altogether.
  // const embeddedMode = urlParams.has('embedded')

  // if (embeddedMode) {
  $redirect(`/?${urlParams.toString()}`)
  // } else {
  //   authClient.subscribe(async (client) => {
  //     // We need this check since `null` is
  //     // the initial value for the `auth` store.
  //     if (!client) {
  //       return
  //     }

  //     const isAuthenticated = await client.isAuthenticated()
  //     console.log('isAuthenticated', isAuthenticated)

  //     if (!isAuthenticated) {
  //       client.loginWithRedirect({
  //         redirect_uri: `${window.location.origin}/sign-in-callback${window.location.search}`,
  //       })
  //     }
  //   })
  // }
</script>

<!-- {#if embeddedMode} -->
<slot />
<!-- {:else if $authClient}
  {#if $currentUser}
    <slot />
  {/if}
{:else}
  <SplashScreen />
{/if} -->
