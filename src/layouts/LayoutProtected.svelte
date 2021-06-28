<script>
  import SplashScreen from '../components/SplashScreen.svelte'

  import { authClient, currentUser } from '../stores/auth'

  $: if ($authClient) {
    $authClient.isAuthenticated().then((isAuthenticated) => {
      if (!isAuthenticated) {
        $authClient.loginWithRedirect()
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
