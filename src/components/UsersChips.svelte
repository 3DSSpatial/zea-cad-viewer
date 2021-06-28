<script>
  import { slide } from 'svelte/transition'

  import UserChip from './UserChip.svelte'

  export let session

  let users = []

  const hasUser = (user) => users.find((e) => e.id === user.id)

  const addUser = (user) => {
    if (hasUser(user)) {
      return
    }

    users = users.concat(user)
  }

  const removeUser = (user) => {
    users = users.filter((e) => e.id !== user.id)
  }

  session.sub('user-joined', (user) => {
    addUser(user)
  })

  session.sub('user-left', (user) => {
    removeUser(user)
  })
</script>

<div class="UsersChips flex flex-1">
  {#each users as user, i}
    <div class:-ml-5={i > 0} transition:slide>
      <UserChip {user} />
    </div>
  {/each}
</div>
