import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { Fonts, Gif, GifRenderer, Renderer } from '@matrixled-ssr/renderer'
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
    const canvas = createCanvas(64, 32)
    const renderer = new Renderer(canvas, fonts, (width, height) => createCanvas(width, height))

    const gif = await readFile(app.publicPath('pacman-small.gif'))

    const gifRenderer = new GifRenderer(
      {
        canvas,
        fonts,
        renderer,
      },
      {
        fontPath: app.publicPath('bitbuntu-full.bdf'),
        background: {
          type: 'gif',
          base64: gif.toString('base64'),
        },
        layers: [
          {
            type: 'text',
            text: getDisplayTime(),
            x: 17,
            y: 10,
          },
          {
            type: 'text',
            text: 'MatrixLED',
            x: 0,
            y: 0,
          },
        ],
      }
    )
    await gifRenderer.loadResources()

    const font = await fonts.get(app.publicPath('bitbuntu-full.bdf'))
    const gifComponent = new Gif(renderer, gif.buffer)

    const processDir = await mkdtemp(join(tmpdir(), 'frames-'))

    const renders: Promise<void>[] = []
    const inputFileContent: string[] = []

    gifComponent.frames.forEach((frame, i) => {
      // renderer.clear()
      // // gifComponent.renderFrame(i)
      // renderer.drawBitmapText(font, getDisplayTime(), 17, 1, {
      //   color: '#ffffff',
      // })
      gifRenderer.renderFrame(i)

      const imagePath = join(processDir, `frame-${i}.png`)

      const imageData = canvas.toBuffer('image/png')
      renders.push(
        new Promise((resolve) => {
          writeFile(imagePath, imageData).then(() => {
            resolve()
          })
        })
      )
      inputFileContent.push(`file '${imagePath}'`)
      inputFileContent.push(`duration ${frame.delay / 1000}`)
    })

    await Promise.all(renders)

    inputFileContent.push(inputFileContent[inputFileContent.length - 2])
    const inputFilePath = join(processDir, 'input.txt')
    await writeFile(inputFilePath, inputFileContent.join('\n'), { encoding: 'utf-8', flag: 'w' })

    const g = ffmpeg()
      .input(inputFilePath)
      .inputFormat('concat')
      .inputOptions('-safe 0')
      .complexFilter('scale=64:32')
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
