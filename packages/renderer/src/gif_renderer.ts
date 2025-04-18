import { type Font } from 'bdfparser'
import { Fonts } from './fonts'
import { RendererConfig } from './render_config'
import { CanvasElementLike, Renderer } from './renderer'
import { Gif } from './components/gif.ts'

export class GifRenderer {
  private _renderer: Renderer
  private _fonts: Fonts

  private _config

  private _font?: Font
  private _backgroundGif?: Gif

  constructor(
    settings: { canvas: CanvasElementLike; fonts: Fonts; renderer: Renderer },
    config: RendererConfig
  ) {
    this._renderer = settings.renderer
    this._fonts = settings.fonts
    this._config = config
  }

  async loadResources() {
    this._font = await this._fonts.get(this._config.fontPath)

    if (this._config.background.type === 'gif') {
      const gifBuffer = Buffer.from(this._config.background.base64, 'base64')
      this._backgroundGif = new Gif(this._renderer, gifBuffer)
    }
  }

  renderFrame(frame: number): void {
    this._renderer.clear()
    this._backgroundGif?.renderFrame(frame)
    this._config.layers.forEach((layer) => {
      if (layer.type === 'text') {
        this._renderer.drawBitmapText(this._font!, layer.text, layer.x, layer.y, {
          color: '#ffffff',
        })
      }
    })
  }
}
