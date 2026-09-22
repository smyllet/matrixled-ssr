/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    session: {
      store: typeof routes['auth.session.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    session: {
      destroy: typeof routes['profile.session.destroy']
    }
  }
  devices: {
    index: typeof routes['devices.index']
    show: typeof routes['devices.show']
    store: typeof routes['devices.store']
    patch: typeof routes['devices.patch']
    delete: typeof routes['devices.delete']
  }
  renderers: {
    index: typeof routes['renderers.index']
    show: typeof routes['renderers.show']
    store: typeof routes['renderers.store']
    patch: typeof routes['renderers.patch']
    delete: typeof routes['renderers.delete']
    token: typeof routes['renderers.token']
  }
  scenes: {
    index: typeof routes['scenes.index']
    show: typeof routes['scenes.show']
    store: typeof routes['scenes.store']
    patch: typeof routes['scenes.patch']
    delete: typeof routes['scenes.delete']
  }
  eventStream: typeof routes['event_stream']
  subscribe: typeof routes['subscribe']
  unsubscribe: typeof routes['unsubscribe']
}
