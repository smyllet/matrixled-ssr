import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { Fonts, Gif, Renderer } from '@matrixled-ssr/renderer'
import { createCanvas } from 'canvas'
import ffmpeg from 'fluent-ffmpeg'
import { mkdtemp, readFile, rmdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import readlineiter from 'readlineiter'

function getDisplayTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

export default class RendererController {
  public async render({ response }: HttpContext) {
    const fonts = new Fonts(readlineiter)
    const gif = await readFile(app.publicPath('pacman-small.gif'))
    const font = await fonts.get(app.publicPath('bitbuntu-full.bdf'))

    const canvas = createCanvas(64, 32)

    const renderer = new Renderer(canvas, fonts, (width, height) => createCanvas(width, height))
    const gifComponent = new Gif(renderer, gif.buffer)

    const processDir = await mkdtemp(join(tmpdir(), 'frames-'))

    const renders = []

    for (let i = 0; i < gifComponent.frames.length; i++) {
      renderer.clear()
      gifComponent.render(i)
      renderer.drawBitmapText(font, getDisplayTime(), 17, 1, {
        color: '#ffffff',
      })

      const imageData = canvas.toBuffer('image/png')
      renders.push(
        new Promise((resolve) => {
          writeFile(join(processDir, `frame-${i}.png`), imageData).then(() => {
            resolve(true)
          })
        })
      )
    }

    await Promise.all(renders)

    const g = ffmpeg()
      .input(join(processDir, 'frame-%d.png'))
      .output(join(processDir, 'output.gif'))

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      g.on('end', async () => {
        readFile(join(processDir, 'output.gif')).then((data) => {
          resolve(data)
        })
      })
        .on('error', (err) => {
          console.error('Error:', err)
          reject(err)
        })
        .run()
    })

    await rmdir(processDir, { recursive: true })

    response.safeHeader('Content-Type', 'image/gif')
    response.send(buffer)
  }
}
