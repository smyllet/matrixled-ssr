import RendererEvent from '#events/base/renderer_event'

export default class RendererUpdated extends RendererEvent {
  readonly name = 'renderer.updated' as const
}
