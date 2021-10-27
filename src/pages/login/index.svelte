<script>
  import { redirect } from '@roxi/routify'
  import { onMount, tick } from 'svelte'

  import { auth } from '../../helpers/auth.js'
  import { getRandomString } from '../../helpers/misc.js'

  const urlParams = new URLSearchParams(window.location.search)
  const embeddedMode = urlParams.has('embedded')
  const collabEnabled = true
  let authError
  let shouldShowLayout
  let submitted
  let usernameEl
  const getRandomRoomId = ()=>{
    return `${getRandomString(3)}-${getRandomString(3)}-${getRandomString(3)}`
  }
  let roomId = urlParams.has('roomId') ? urlParams.get('roomId') : getRandomRoomId()

  const formFields = {
    password: '',
    username: '',
    roomId,
  }

  const userId = getRandomString()

  const insertParam = (key, value) => {
    key = encodeURIComponent(key)
    value = encodeURIComponent(value)

    // kvp looks like ['key1=value1', 'key2=value2', ...]
    var kvp = document.location.search.substr(1).split('&')
    let i = 0

    for (; i < kvp.length; i++) {
      if (kvp[i].startsWith(key)) {
        const pair = kvp[i].split('=')
        pair[1] = value
        kvp[i] = pair.join('=')
        break
      }
    }

    if (i >= kvp.length) {
      kvp[kvp.length] = [key, value].join('=')
    }

    const params = kvp.length > 1 ? kvp.join('&') : kvp[0]

    // reload page with new params
    $redirect('/?' + params)
  }

  const redirectToMain = () => {
    const params = new URLSearchParams(window.location.search)
    $redirect('/?' + params.toString())
  }

  const handleSubmit = async () => {
    const { Color } = window.zeaEngine
    const userData = {
      color: Color.random().toHex(),
      firstName: formFields.username,
      id: userId,
      lastName: '',
      password: formFields.password,
      username: formFields.username
    }


    try {
      await auth.setUserData(userData)

      submitted = true
      //Note: this causes a reload of the page.
      insertParam('roomId', formFields.roomId)
    } catch (err) {
      authError = err
    }
  }

  onMount(async () => {
    const isAuthenticated = await auth.isAuthenticated()

    if (isAuthenticated && (!collabEnabled || urlParams.get('roomId'))) {
      redirectToMain()
      return
    }

    shouldShowLayout = true

    // If the user is a returning user and need to just enter a room id
    // prepopulate the Username field here.
    const userData = await auth.getUserData()
    if (userData) usernameEl.value = userData.firstName

    await tick()

    usernameEl.focus()
  })
</script>

{#if shouldShowLayout}
  <div
    class="bg-background min-h-full flex items-center justify-center py-12 px-4 text-foreground sm:px-6 lg:px-8"
  >
    <div class="max-w-md w-full space-y-8">
      <h2 class="mt-6 text-center text-3xl font-extrabold">Zea Svelte Template</h2>
      <p class="mt-6 text-center">This is an MIT open sourced template application that can be used to build your own custom applications.</p>

      <form
        class="mt-8 space-y-6"
        on:submit|preventDefault|stopPropagation={handleSubmit}
      >
        <div class="rounded-md shadow-sm">
          <p class="mt-6 text-center">Enter a username and the password to start the app.</p>
          <p class="text-center">Note: the defualt password is 'zea' and can be modified in 'auth.js' or you can integrate an authentication service like Auth0.</p>
          <div class="mb-2">
            <input
              autocomplete="off"
              bind:this={usernameEl}
              bind:value={formFields.username}
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
              name="username"
              placeholder="Username"
              required
              type="text"
            />
          </div>

          <div class="mb-2">
            <input
              autocomplete="off"
              bind:value={formFields.password}
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
              name="password"
              placeholder="Password (zea)"
              required
              type="password"
            />
          </div>

          {#if collabEnabled}
            <div class="mb-2">
              <p class="mt-6 text-center">The roomId allows other users to join you in a collaborative session.</p>
              <input
                autocomplete="off"
                bind:value={formFields.roomId}
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                name="roomId"
                placeholder="Room ID (optional)"
                type="text"
              />
            </div>
          {/if}
        </div>

        {#if authError}
          <span class="font-medium tracking-wide text-red-500 text-xs">
            {authError.message}
          </span>
        {/if}

        <div>
          <button
            disabled={submitted}
            type="submit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-800 bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
