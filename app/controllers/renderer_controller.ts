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
        assets: [
          {
            id: '@panel/gif/night',
            base64:
              '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',
          },
        ],
        template: {
          background: {
            type: 'gif',
            color: '#FF0000',
            asset: '@panel/gif/night',
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
