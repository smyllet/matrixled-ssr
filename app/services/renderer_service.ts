import Matrix from '#models/matrix'
import { RenderConfig, renderConfigValidator } from '#validators/render_config_validator'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import fs from 'node:fs'

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

    let config: RenderConfig = { version: 1, duration: undefined, panels: [] }

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

  private async renderMatrix(matrix: Matrix) {
    if (!this.renders[matrix.id]) {
      return
    }

    logger.info(`Rendering matrix ${matrix.id}`)

    const { config } = this.renders[matrix.id]

    for (const panel of config.panels) {
      const gif = await new Promise<Buffer | undefined>((resolve) => {
        let filePath = app.makePath(`testFiles/pacman.gif`)

        switch (panel.gifName) {
          case 'tardis':
            filePath = app.makePath(`testFiles/tardis.gif`)
            break
          case 'life':
            filePath = app.makePath(`testFiles/life.gif`)
            break
          case 'homer':
            filePath = app.makePath(`testFiles/homer.gif`)
            break
          case 'pacman':
            filePath = app.makePath(`testFiles/pacman.gif`)
            break
        }

        return fs.readFile(filePath, (err, data) => {
          if (err) {
            logger.error(err)
            return
          }

          resolve(data)
        })
      })

      this.renders[matrix.id].gifs.push(gif || Buffer.from([]))
    }

    emitter.emit('matrix:render:updated', matrix)
  }

  getRender(matrix: Matrix) {
    return this.renders[matrix.id]?.gifs[this.renders[matrix.id].index] || Buffer.from([])
  }
}

export { RendererService }
