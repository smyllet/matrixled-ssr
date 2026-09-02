/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.session.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.session.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'matrices.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/matrices'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['index']>>>
    }
  }
  'matrices.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/matrices/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['show']>>>
    }
  }
  'matrices.store': {
    methods: ["POST"]
    pattern: '/api/v1/matrices'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/matrix').createMatrixValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/matrix').createMatrixValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'matrices.patch': {
    methods: ["PATCH"]
    pattern: '/api/v1/matrices/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/matrix').patchMatrixValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/matrix').patchMatrixValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['patch']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['patch']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'matrices.delete': {
    methods: ["DELETE"]
    pattern: '/api/v1/matrices/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/matrix').deleteMatrixValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/matrix').deleteMatrixValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['delete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/matrices_controller').default['delete']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'renderers.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/renderers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['index']>>>
    }
  }
  'renderers.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/renderers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/renderer').showRendererValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'renderers.store': {
    methods: ["POST"]
    pattern: '/api/v1/renderers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/renderer').createRendererValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/renderer').createRendererValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'renderers.patch': {
    methods: ["PATCH"]
    pattern: '/api/v1/renderers/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/renderer').patchRendererValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/renderer').patchRendererValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['patch']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['patch']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'renderers.delete': {
    methods: ["DELETE"]
    pattern: '/api/v1/renderers/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/renderer').deleteRendererValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/renderer').deleteRendererValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['delete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['delete']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'renderers.token': {
    methods: ["POST"]
    pattern: '/api/v1/renderers/:id/token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/renderer').rotateRendererTokenValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/renderer').rotateRendererTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['rotateToken']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/renderers_controller').default['rotateToken']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'scenes.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/scenes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['index']>>>
    }
  }
  'scenes.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/scenes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/scene').showSceneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'scenes.store': {
    methods: ["POST"]
    pattern: '/api/v1/scenes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/scene').createSceneValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/scene').createSceneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'scenes.patch': {
    methods: ["PATCH"]
    pattern: '/api/v1/scenes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/scene').patchSceneValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/scene').patchSceneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['patch']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['patch']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'scenes.delete': {
    methods: ["DELETE"]
    pattern: '/api/v1/scenes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/scene').deleteSceneValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/scene').deleteSceneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['delete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scenes_controller').default['delete']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'event_stream': {
    methods: ["GET","HEAD"]
    pattern: '/__transmit/events'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'subscribe': {
    methods: ["POST"]
    pattern: '/__transmit/subscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'unsubscribe': {
    methods: ["POST"]
    pattern: '/__transmit/unsubscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
}
