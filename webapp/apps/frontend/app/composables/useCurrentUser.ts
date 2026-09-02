/**
 * The signed-in user, fetched once and shared by key: every caller of this
 * composable joins the same `useAsyncData('user')` request rather than issuing
 * its own.
 */
export function useCurrentUser() {
  const { $api } = useNuxtApp()

  return useAsyncData('user', async () => {
    const [data, error] = await $api.request('profile.profile.show', {}).safe()

    if (error) {
      return undefined
    }

    return data.data
  })
}
