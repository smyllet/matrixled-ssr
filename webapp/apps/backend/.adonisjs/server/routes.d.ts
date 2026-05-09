import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.session.destroy': { paramsTuple?: []; params?: {} }
    'matrices.index': { paramsTuple?: []; params?: {} }
    'matrices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'matrices.store': { paramsTuple?: []; params?: {} }
    'matrices.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'matrices.index': { paramsTuple?: []; params?: {} }
    'matrices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'matrices.index': { paramsTuple?: []; params?: {} }
    'matrices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.session.store': { paramsTuple?: []; params?: {} }
    'profile.session.destroy': { paramsTuple?: []; params?: {} }
    'matrices.store': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'matrices.patch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}