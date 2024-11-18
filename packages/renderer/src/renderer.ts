import { type Font } from 'bdfparser'
import { type Fonts } from './fonts.ts'

export class Renderer {
  private _context: CanvasRenderingContext2D

  constructor(
    public canvas: HTMLCanvasElement,
    public fonts: Fonts,
    private _createCanvas: (width: number, height: number) => HTMLCanvasElement
  ) {
    this._context = get2DContext(canvas)
  }

  createCanvas(width: number, height: number): HTMLCanvasElement {
    return this._createCanvas(width, height)
  }

  writeNativeText(
    text: string,
    x: number,
    y: number,
    options?: { size?: number; font?: string; color?: string }
  ): void {
    const font = options?.font ?? 'Arial'
    const size = options?.size ?? 16
    const color = options?.color ?? 'white'

    this._context.font = `${size}px ${font}`
    this._context.fillStyle = color
    this._context.fillText(text, x, y + size)
  }

  drawBitmapText(
    font: Font,
    text: string,
    x: number,
    y: number,
    options?: { scale?: number; color?: string; backgroundColor?: string }
  ) {
    const scale = options?.scale ?? 1

    this._context.fillStyle = options?.color ?? 'white'
    this.context.translate(x, y)
    font
      .draw(text)
      .enlarge(scale, scale)
      .draw2canvas(this._context, {
        0: options?.backgroundColor ?? 'transparent',
        1: options?.color ?? 'red',
        2: 'transparent',
      })
    this.context.resetTransform()
  }

  drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    options: { scale?: { x?: number; y?: number } }
  ) {
    this.context.scale(options?.scale?.x ?? 0, options?.scale?.y ?? 0)
    this.context.drawImage(image, x, y)
    this.context.resetTransform()
  }

  clear() {
    this.context.fillStyle = 'black'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  get context() {
    return this._context
  }
}

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('2d context not supported')
  }

  return context
}
