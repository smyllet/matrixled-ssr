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
  matrices: {
    index: typeof routes['matrices.index']
    show: typeof routes['matrices.show']
    store: typeof routes['matrices.store']
    patch: typeof routes['matrices.patch']
    delete: typeof routes['matrices.delete']
  }
  renderers: {
    index: typeof routes['renderers.index']
    show: typeof routes['renderers.show']
    store: typeof routes['renderers.store']
    patch: typeof routes['renderers.patch']
    delete: typeof routes['renderers.delete']
    token: typeof routes['renderers.token']
  }
}
