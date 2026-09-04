import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.session.destroy': { paramsTuple?: []; params?: {} }
    'devices.index': { paramsTuple?: []; params?: {} }
    'devices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'devices.store': { paramsTuple?: []; params?: {} }
    'devices.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'devices.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.index': { paramsTuple?: []; params?: {} }
    'renderers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.store': { paramsTuple?: []; params?: {} }
    'renderers.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.token': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.index': { paramsTuple?: []; params?: {} }
    'scenes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.store': { paramsTuple?: []; params?: {} }
    'scenes.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'devices.index': { paramsTuple?: []; params?: {} }
    'devices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.index': { paramsTuple?: []; params?: {} }
    'renderers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.index': { paramsTuple?: []; params?: {} }
    'scenes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'devices.index': { paramsTuple?: []; params?: {} }
    'devices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.index': { paramsTuple?: []; params?: {} }
    'renderers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.index': { paramsTuple?: []; params?: {} }
    'scenes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'profile.session.destroy': { paramsTuple?: []; params?: {} }
    'devices.store': { paramsTuple?: []; params?: {} }
    'renderers.store': { paramsTuple?: []; params?: {} }
    'renderers.token': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.store': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'devices.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'devices.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'renderers.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scenes.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}