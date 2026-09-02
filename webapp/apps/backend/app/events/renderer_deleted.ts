import RendererEvent from '#events/base/renderer_event'

export default class RendererDeleted extends RendererEvent {
  readonly name = 'renderer.deleted' as const
}
