import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { Fonts, GifRenderer, Renderer } from '@matrixled-ssr/renderer'
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

    const gifRenderer = new GifRenderer(
      {
        canvas,
        fonts,
        renderer,
        getFont: (_fonts, fontPath) => _fonts.get(app.publicPath(fontPath)),
        getAsset: (assetPath) => readFile(app.publicPath(assetPath)),
      },
      {
        template: {
          background: {
            type: 'gif',
            color: '#FF0000',
            asset: '@system/gif/pacman',
          },
          layers: [
            {
              type: 'text',
              text: 'MatrixLED',
              x: 6,
              y: 0,
            },
            {
              type: 'text',
              text: getDisplayTime(),
              x: 17,
              y: 22,
            },
          ],
        },
      }
    )
    await gifRenderer.load()

    const processDir = await mkdtemp(join(tmpdir(), 'frames-'))

    const renders: Promise<void>[] = []
    const inputFileContent: string[] = []

    for (let i = 0; i < gifRenderer.frames.length; i++) {
      const frame = gifRenderer.frames[i]

      await gifRenderer.renderFrame(i)

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
    }

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
