import createAuth0Client from '@auth0/auth0-spa-js'
import { derived, readable } from 'svelte/store'

import type { Auth0Client, User } from '@auth0/auth0-spa-js'

// const auth0ClientOptions = {
//   client_id: 'cSxWDidNyUAzvrz4Y1UGk1XHg55NoQRr',
//   domain: 'zea-development.auth0.com',
//   redirect_uri: `${window.location.origin}/sign-in-callback`,
//   audience: 'cloud-api.zea.live',
// }

const auth0ClientOptions = {
  client_id: 'p6VtJXuHxzMbduitjEwHo8Aog8KoFAHe',
  domain: 'zea-staging.auth0.com',
  redirect_uri: `${window.location.origin}/sign-in-callback`,
  audience: 'cloud-api.zea.live',
}

let cachedAuth0Client: Auth0Client
let cachedCurrentUser: User

const authClient = readable<Auth0Client>(null, (set) => {
  console.info(
    'Subscribers went from zero to one in `authClient` readable store.'
  )

  if (cachedAuth0Client) {
    set(cachedAuth0Client)
    return
  }

  createAuth0Client(auth0ClientOptions).then((client) => {
    cachedAuth0Client = client
    set(client)
  })

  return () => {
    console.info(
      'Subscribers went from one to zero in `authClient` readable store.'
    )
  }
})

const currentUser = derived<typeof authClient, User>(
  authClient,
  async ($authClient, set) => {
    if (cachedCurrentUser) {
      set(cachedCurrentUser)
      return
    }

    if (!$authClient) {
      return
    }

    const isAuthenticated = await $authClient.isAuthenticated()

    if (!isAuthenticated) {
      return
    }

    const user = await $authClient.getUser()

    cachedCurrentUser = user
    set(user)
  }
)

export { authClient, currentUser }
