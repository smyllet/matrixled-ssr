import { type Font } from 'bdfparser'
import { Gif } from './components/gif.ts'
import { Fonts } from './fonts'
import { ProcessedTemplate } from './render_config'
import { CanvasElementLike, Renderer } from './renderer'

export class GifRenderer {
  private _renderer: Renderer
  private _fonts: Fonts

  private _getFont: (fonts: Fonts, fontPath: string) => Promise<Font>

  private _template: ProcessedTemplate

  private _font?: Font
  private _backgroundGif?: Gif

  private _loaded = false

  frames: {
    delay: number
  }[]

  constructor(
    settings: {
      canvas: CanvasElementLike
      fonts: Fonts
      renderer: Renderer
      getFont: (fonts: Fonts, fontPath: string) => Promise<Font>
    },
    config: { template: ProcessedTemplate }
  ) {
    this._renderer = settings.renderer
    this._fonts = settings.fonts
    this._getFont = settings.getFont

    this._template = config.template

    this.frames = [
      {
        delay: 0,
      },
    ]
  }

  async load() {
    this._font = await this._getFont(this._fonts, 'fonts/bitbuntu-full.bdf')

    if (this._template.background.type === 'gif') {
      let gifBuffer = Buffer.from(this._template.background.base64, 'base64')

      if (gifBuffer) {
        this._backgroundGif = new Gif(this._renderer, gifBuffer)
        this.frames = this._backgroundGif.frames.map((frame) => ({
          delay: frame.delay,
        }))
      }
    }

    this._loaded = true
  }

  async renderFrame(frame: number): Promise<void> {
    if (!this._loaded) {
      await this.load()
    }

    this._renderer.clear()

    if (this._template.background.type === 'color') {
      const color = this._template.background.color
      this._renderer.fillRect(0, 0, this._renderer.canvas.width, this._renderer.canvas.height, {
        color: color,
      })
    }

    if (this._backgroundGif) {
      this._backgroundGif?.renderFrame(frame)
    }
    this._template.layers.forEach((layer) => {
      if (layer.type === 'text') {
        this._renderer.drawBitmapText(this._font!, layer.text, layer.x, layer.y, {
          color: '#ffffff',
        })
      }
    })
  }
}
