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
}
