import Matrix from '#models/matrix'
import { RenderConfig, renderConfigValidator } from '#validators/render_config_validator'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import {
  Fonts,
  GifRenderer,
  ProcessedTemplate,
  Renderer,
  RendererTemplate,
} from '@matrixled-ssr/renderer'
import { createCanvas } from 'canvas'
import ffmpeg from 'fluent-ffmpeg'
import { mkdtemp, readFile, rmdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import readlineiter from 'readlineiter'

const ASSETS_PATHS = [
  {
    id: '@system/gif/pacman',
    path: 'gif/pacman.gif',
  },
  {
    id: '@system/gif/pacman2',
    path: 'gif/pacman2.gif',
  },
  {
    id: '@system/gif/tardis',
    path: 'gif/tardis.gif',
  },
  {
    id: '@system/gif/homer',
    path: 'gif/homer.gif',
  },
  {
    id: '@system/gif/life',
    path: 'gif/life.gif',
  },
]

const GIF_PATHS = {
  pacman: app.publicPath(`gif/pacman.gif`),
  pacman2: app.publicPath(`gif/pacman2.gif`),
  tardis: app.publicPath(`gif/tardis.gif`),
  life: app.publicPath(`gif/life.gif`),
  homer: app.publicPath(`gif/homer.gif`),
}

class RendererService {
  private renders: Record<
    number,
    {
      matrix: Matrix
      config: RenderConfig
      index: number
      gifs: Buffer[]
      timeout?: NodeJS.Timeout
    }
  > = {}

  async initialize() {
    logger.info('Initializing renderer service')

    const matrices = await Matrix.query()

    for (const matrix of matrices) {
      await this.addMatrix(matrix)
    }
  }

  async addMatrix(matrix: Matrix) {
    if (this.renders[matrix.id]) {
      return
    }

    let config: RenderConfig = { version: 1, duration: undefined, panels: [], assets: [] }

    try {
      config = await renderConfigValidator.validate(JSON.parse(matrix.config))
    } catch (error) {
      logger.error(error)
    }

    if (config.panels.length === 0) {
      return
    }

    this.renders[matrix.id] = {
      matrix,
      config: config,
      index: 0,
      gifs: [],
    }

    await this.renderMatrix(matrix)

    this.initializeMatrixLoop(matrix)
  }

  private initializeMatrixLoop(matrix: Matrix) {
    if (!this.renders[matrix.id]) {
      return
    }

    if (this.renders[matrix.id].timeout) {
      clearTimeout(this.renders[matrix.id].timeout)
    }

    const nextIndex = (this.renders[matrix.id].index + 1) % this.renders[matrix.id].gifs.length
    const nextDuration =
      (this.renders[matrix.id].config.panels[this.renders[matrix.id].index].duration ||
        this.renders[matrix.id].config.duration ||
        10) * 1000

    this.renders[matrix.id].timeout = setTimeout(() => {
      this.renders[matrix.id].index = nextIndex
      emitter.emit('matrix:render:updated', matrix)
      this.initializeMatrixLoop(matrix)
    }, nextDuration)
  }

  deleteMatrix(matrix: Matrix) {
    if (!this.renders[matrix.id]) {
      return
    }

    if (this.renders[matrix.id].timeout) {
      clearTimeout(this.renders[matrix.id].timeout)
    }

    delete this.renders[matrix.id]
  }

  private async processTemplate(
    config: RenderConfig,
    template: RendererTemplate
  ): Promise<{
    processedTemplate: ProcessedTemplate
  }> {
    const assets: Record<string, string> = {}

    const processedTemplate: ProcessedTemplate = {
      background: { type: 'color', color: '#000000' },
      layers: [],
    }

    // Process background
    if (template.background.type === 'color') {
      processedTemplate.background = {
        type: 'color',
        color: template.background.color,
      }
    }

    if (template.background.type === 'gif' && template.background.asset) {
      const assetName = template.background.asset
      if (!assets[assetName]) {
        const systemAsset = ASSETS_PATHS.find((a) => a.id === assetName)

        if (systemAsset) {
          const file = await readFile(app.publicPath(systemAsset.path))
          assets[assetName] = file.toString('base64')
        } else {
          const matrixAsset = config.assets?.find((a) => a.id === assetName)
          if (matrixAsset) {
            assets[assetName] = matrixAsset.base64
          }
        }
      }

      if (assets[assetName]) {
        processedTemplate.background = {
          type: template.background.type,
          base64: assets[assetName],
        }
      }
    }

    // Process layers
    for (const layer of template.layers) {
      if (layer.type === 'text') {
        processedTemplate.layers.push({
          type: 'text',
          text: layer.text,
          x: layer.x ?? 0,
          y: layer.y ?? 0,
        })
      }
    }

    return { processedTemplate }
  }

  private async renderMatrix(matrix: Matrix) {
    if (!this.renders[matrix.id]) {
      return
    }

    logger.info(`Rendering matrix ${matrix.id}`)

    const { config } = this.renders[matrix.id]

    for (const panel of config.panels) {
      if (panel.type === 'hardCodedGif') {
        type GifNames = keyof typeof GIF_PATHS
        function isGifName(gifName: string): gifName is GifNames {
          return gifName in GIF_PATHS
        }

        const gifName = isGifName(panel.gifName) ? panel.gifName : 'pacman'
        const filePath = GIF_PATHS[gifName]

        let gif
        try {
          gif = await readFile(filePath)
        } catch (error) {
          logger.error(error)
        }

        this.renders[matrix.id].gifs.push(gif || Buffer.from([]))
      } else if (panel.type === 'renderer') {
        const fonts = new Fonts(readlineiter)
        const canvas = createCanvas(matrix.width, matrix.height)
        const renderer = new Renderer(canvas, fonts, (width, height) => createCanvas(width, height))

        const { processedTemplate } = await this.processTemplate(config, panel.template)

        const gifRenderer = new GifRenderer(
          {
            canvas,
            fonts,
            renderer,
            getFont: (_fonts, fontPath) => _fonts.get(app.publicPath(fontPath)),
          },
          {
            template: processedTemplate,
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
        await writeFile(inputFilePath, inputFileContent.join('\n'), {
          encoding: 'utf-8',
          flag: 'w',
        })

        const g = ffmpeg()
          .input(inputFilePath)
          .inputFormat('concat')
          .inputOptions('-safe 0')
          .complexFilter(`scale=${matrix.width}:${matrix.height}`)
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

        this.renders[matrix.id].gifs.push(buffer)
      }
    }

    emitter.emit('matrix:render:updated', matrix)
  }

  getRender(matrix: Matrix) {
    return this.renders[matrix.id]?.gifs[this.renders[matrix.id].index] || Buffer.from([])
  }
}

export { RendererService }
