import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs'

export default class TestsController {
  /**
   * Display a list of resource
   */
  async index({ params, response }: HttpContext) {
    let filePath = app.makePath(`testFiles/pacman.gif`)

    switch (app.config.get('testGif')) {
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

    const gif = fs.readFileSync(filePath)

    response.header('Content-Type', 'image/gif')
    response.send(gif)

    // response.download(filePath)
  }

  /**
   * Display form to create a new record
   */
  async create({}: HttpContext) {}

  /**
   * Handle form submission for the create action
   */
  async store({ request }: HttpContext) {}

  /**
   * Show individual record
   */
  async show({ params }: HttpContext) {}

  /**
   * Edit individual record
   */
  async edit({ params }: HttpContext) {}

  /**
   * Handle form submission for the edit action
   */
  async update({ params }: HttpContext) {}

  /**
   * Delete record
   */
  async destroy({ params }: HttpContext) {}
}
