<script>
  export let user

  let initials
  let shouldShowUserMenu = false

  const handleUserChipClick = (event) => {
    event.stopPropagation()

    shouldShowUserMenu = !shouldShowUserMenu

    const listener = () => {
      shouldShowUserMenu = false

      document.removeEventListener('click', listener)
    }

    document.addEventListener('click', listener)
  }

  $: avatar = user.avatar || user.picture
  $: firstName = user.firstName || user.given_name || ' '
  $: lastName = user.lastName || user.family_name || ' '

  $: initials = `${firstName[0].toUpperCase()}${lastName[0].toUpperCase()}`
</script>

<div
  class="UserChip cursor-default relative transform hover:scale-105 transition-transform"
>
  <div
    class="h-8 w-8 flex items-center justify-center rounded-full truncate text-white bg-cover border border-gray-500"
    on:click={handleUserChipClick}
    style="background-color: {user.color}; background-image: url('{avatar}');"
    title="{firstName} {lastName}"
  >
    {#if !avatar}
      {initials}
    {/if}
  </div>

  <div
    class="absolute rounded p-2 shadow bg-background right-0 w-max border border-gray-700"
    class:hidden={!shouldShowUserMenu}
  >
    <div class="mb-2">
      {firstName}
      {lastName}
    </div>
    <slot />
  </div>
</div>
