import RendererEvent from '#events/base/renderer_event'

export default class RendererCreated extends RendererEvent {
  readonly name = 'renderer.created' as const
}
