<script>
  import { redirect } from '@roxi/routify'
  import SplashScreen from '../components/SplashScreen.svelte'

  import { authClient, currentUser } from '../stores/auth'
  const urlParams = new URLSearchParams(window.location.search)

  $: if ($authClient) {
    if (!urlParams.has('embedded')) {
      $authClient.isAuthenticated().then((isAuthenticated) => {
        if (!isAuthenticated) {
          $authClient.loginWithRedirect({
            redirect_uri: `${window.location.origin}/sign-in-callback${window.location.search}`,
          })
        }
      })
    } else {
      $redirect(`/?${urlParams.toString()}`)
    }
  }
</script>

{#if urlParams.has('embedded')}
  <slot />
{:else if $authClient}
  {#if $currentUser}
    <slot />
  {/if}
{:else}
  <SplashScreen />
{/if}
