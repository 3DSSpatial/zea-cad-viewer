import { createZeaCloudClient } from '@zeainc/zea-cloud-sdk-web'
import type { ZeaCloudClient } from '@zeainc/zea-cloud-sdk-web'
import { derived } from 'svelte/store'

import { authClient } from './auth'

let cachedZeaCloudClient: ZeaCloudClient

const zeaCloudClient = derived<typeof authClient, ZeaCloudClient>(
  authClient,
  async ($authClient, set) => {
    if (cachedZeaCloudClient) {
      set(cachedZeaCloudClient)
      return
    }

    if (!$authClient) {
      return
    }

    const token = await $authClient.getTokenSilently()

    const client = createZeaCloudClient({
      token,
      // environmentTag: 'development',
      environmentTag: 'staging',
    })

    cachedZeaCloudClient = client

    set(client)
  }
)

export { zeaCloudClient }
