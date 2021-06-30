<script>
  import SplashScreen from '../components/SplashScreen.svelte'

  import { authClient, currentUser } from '../stores/auth'

  $: if ($authClient) {
    $authClient.isAuthenticated().then((isAuthenticated) => {
      if (!isAuthenticated) {
        $authClient.loginWithRedirect({
          redirect_uri: `${window.location.origin}/sign-in-callback${window.location.search}`,
        })
      }
    })
  }
</script>

{#if $authClient}
  {#if $currentUser}
    <slot />
  {/if}
{:else}
  <SplashScreen />
{/if}
