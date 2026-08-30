/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.session.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.session.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.session.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.session.destroy']['types'],
  },
  'matrices.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/matrices',
    tokens: [{"old":"/api/v1/matrices","type":0,"val":"api","end":""},{"old":"/api/v1/matrices","type":0,"val":"v1","end":""},{"old":"/api/v1/matrices","type":0,"val":"matrices","end":""}],
    types: placeholder as Registry['matrices.index']['types'],
  },
  'matrices.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/matrices/:id',
    tokens: [{"old":"/api/v1/matrices/:id","type":0,"val":"api","end":""},{"old":"/api/v1/matrices/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/matrices/:id","type":0,"val":"matrices","end":""},{"old":"/api/v1/matrices/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['matrices.show']['types'],
  },
  'matrices.store': {
    methods: ["POST"],
    pattern: '/api/v1/matrices',
    tokens: [{"old":"/api/v1/matrices","type":0,"val":"api","end":""},{"old":"/api/v1/matrices","type":0,"val":"v1","end":""},{"old":"/api/v1/matrices","type":0,"val":"matrices","end":""}],
    types: placeholder as Registry['matrices.store']['types'],
  },
  'matrices.patch': {
    methods: ["PATCH"],
    pattern: '/api/v1/matrices/:id',
    tokens: [{"old":"/api/v1/matrices/:id","type":0,"val":"api","end":""},{"old":"/api/v1/matrices/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/matrices/:id","type":0,"val":"matrices","end":""},{"old":"/api/v1/matrices/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['matrices.patch']['types'],
  },
  'matrices.delete': {
    methods: ["DELETE"],
    pattern: '/api/v1/matrices/:id',
    tokens: [{"old":"/api/v1/matrices/:id","type":0,"val":"api","end":""},{"old":"/api/v1/matrices/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/matrices/:id","type":0,"val":"matrices","end":""},{"old":"/api/v1/matrices/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['matrices.delete']['types'],
  },
  'renderers.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/renderers',
    tokens: [{"old":"/api/v1/renderers","type":0,"val":"api","end":""},{"old":"/api/v1/renderers","type":0,"val":"v1","end":""},{"old":"/api/v1/renderers","type":0,"val":"renderers","end":""}],
    types: placeholder as Registry['renderers.index']['types'],
  },
  'renderers.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/renderers/:id',
    tokens: [{"old":"/api/v1/renderers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/renderers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/renderers/:id","type":0,"val":"renderers","end":""},{"old":"/api/v1/renderers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['renderers.show']['types'],
  },
  'renderers.store': {
    methods: ["POST"],
    pattern: '/api/v1/renderers',
    tokens: [{"old":"/api/v1/renderers","type":0,"val":"api","end":""},{"old":"/api/v1/renderers","type":0,"val":"v1","end":""},{"old":"/api/v1/renderers","type":0,"val":"renderers","end":""}],
    types: placeholder as Registry['renderers.store']['types'],
  },
  'renderers.patch': {
    methods: ["PATCH"],
    pattern: '/api/v1/renderers/:id',
    tokens: [{"old":"/api/v1/renderers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/renderers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/renderers/:id","type":0,"val":"renderers","end":""},{"old":"/api/v1/renderers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['renderers.patch']['types'],
  },
  'renderers.delete': {
    methods: ["DELETE"],
    pattern: '/api/v1/renderers/:id',
    tokens: [{"old":"/api/v1/renderers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/renderers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/renderers/:id","type":0,"val":"renderers","end":""},{"old":"/api/v1/renderers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['renderers.delete']['types'],
  },
  'renderers.token': {
    methods: ["POST"],
    pattern: '/api/v1/renderers/:id/token',
    tokens: [{"old":"/api/v1/renderers/:id/token","type":0,"val":"api","end":""},{"old":"/api/v1/renderers/:id/token","type":0,"val":"v1","end":""},{"old":"/api/v1/renderers/:id/token","type":0,"val":"renderers","end":""},{"old":"/api/v1/renderers/:id/token","type":1,"val":"id","end":""},{"old":"/api/v1/renderers/:id/token","type":0,"val":"token","end":""}],
    types: placeholder as Registry['renderers.token']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
