import type Renderer from '#models/renderer'
import RendererTransformer from '#transformers/renderer_transformer'

/**
 * Used by the two endpoints that mint a credential — creation and rotation —
 * and by nothing else. The clear token is shown once and cannot be read back.
 */
export default class RendererWithTokenTransformer extends RendererTransformer {
  constructor(
    resource: Renderer,
    protected token: string
  ) {
    super(resource)
  }

  override toObject() {
    return {
      ...super.toObject(),
      token: this.token,
    }
  }
}
