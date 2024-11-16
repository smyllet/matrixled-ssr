import { decompressFrames, ParsedFrame, ParsedGif, parseGIF } from 'gifuct-js'
import { BaseComponent } from './base_component'
import { Renderer } from '../renderer'

export class Gif extends BaseComponent {
  public gif: ParsedGif
  public frames: ParsedFrame[]

  private _internalCanvas: HTMLCanvasElement
  private _internalContext: CanvasRenderingContext2D
  private _timeSinceLastGifFrame = 0
  private _currentFrame = 0

  constructor(
    public renderer: Renderer,
    gif: ArrayBuffer
  ) {
    super(renderer)

    this.gif = parseGIF(gif)
    this.frames = decompressFrames(this.gif, true)

    this._internalCanvas = document.createElement('canvas')
    this._internalCanvas.width = this.gif.lsd.width
    this._internalCanvas.height = this.gif.lsd.height
    this._internalContext = this._internalCanvas.getContext('2d') as CanvasRenderingContext2D
    this._internalContext.imageSmoothingEnabled = false
    this._internalContext.imageSmoothingQuality = 'high'

    this._internalCanvas.style.marginTop = '450px'
    document.body.appendChild(this._internalCanvas)
  }

  render(delta: number) {
    this._timeSinceLastGifFrame += delta
    if (this._currentFrame >= this.frames.length) {
      this._currentFrame = 0
    }

    let frameToDraw = this.frames[this._currentFrame]
    if (this._timeSinceLastGifFrame >= this.frames[this._currentFrame].delay) {
      frameToDraw = this.frames[this._currentFrame++]
      this._timeSinceLastGifFrame = 0
    }

    this._drawFrame(frameToDraw)
  }

  private _drawFrame(frame: ParsedFrame) {
    // this._internalContext.clearRect(0, 0, this._internalCanvas.width, this._internalCanvas.height)

    const imageData = this._internalContext.createImageData(frame.dims.width, frame.dims.height)
    imageData.data.set(frame.patch)

    this._internalContext.putImageData(imageData, frame.dims.left, frame.dims.top)

    const scale = this.renderer.canvas.width / this.gif.lsd.width
    this.renderer.drawImage(this._internalCanvas, 0, 0, { scale: { x: scale, y: scale } })
    console.log(
      'size',
      this._internalCanvas.width,
      this._internalCanvas.height,
      scale,
      this.gif.lsd.width * scale,
      this.gif.lsd.height * scale
    )

    return imageData
  }
}
