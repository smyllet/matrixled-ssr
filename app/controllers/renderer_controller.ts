import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import readlineiter from 'readlineiter'
import { Fonts, Gif, Renderer } from '@matrixled-ssr/renderer'
import { createCanvas } from 'canvas'
import { readFile } from 'node:fs/promises'

function getDisplayTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

export default class RendererController {
  public async render({ response, request }: HttpContext) {
    const qs = request.qs()

    const frame = qs.frame ?? 0

    const fonts = new Fonts(readlineiter)
    const gif = await readFile(app.publicPath('pacman-small.gif'))

    const canvas = createCanvas(64, 32)

    const renderer = new Renderer(canvas, fonts, (width, height) => createCanvas(width, height))
    const gifComponent = new Gif(renderer, gif.buffer)

    for (let i = 0; i <= frame; i++) {
      renderer.clear()
      gifComponent.render(frame)
      renderer.writeNativeText(getDisplayTime(), 17, 1, {})
    }

    response.safeHeader('Content-Type', 'image/png')
    return response.stream(canvas.createPNGStream())
  }
}
