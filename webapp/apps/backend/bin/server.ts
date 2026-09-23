/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

await import('reflect-metadata')
const { Ignitor, prettyPrintError } = await import('@adonisjs/core')
type ControlPlane = typeof import('#control_plane/renderer_control_server')

/**
 * Loaded once the application has booted: the control plane reads Adonis
 * services, which do not exist before.
 */
let createServerWithRendererControl: ControlPlane['createServerWithRendererControl']
let rendererControl: ReturnType<ControlPlane['createServerWithRendererControl']>['control']

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.booted(async () => {
      ;({ createServerWithRendererControl } =
        await import('#control_plane/renderer_control_server'))
    })
    /**
     * Terminating hooks run in reverse order of registration, and Adonis
     * registers the one closing the HTTP server once it listens. Registered
     * from `ready`, which comes after, this one runs first: the server's close
     * waits for every open WebSocket, so the renderers must be let go before.
     */
    app.ready(() => {
      app.terminating(() => rendererControl.close())
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  /**
   * The renderer control plane is a WebSocket upgrade on this same server, not
   * an Adonis route: see docs/adr/0024-canal-de-controle-sur-le-serveur-http.md.
   */
  .start((handler) => {
    const { server, control } = createServerWithRendererControl(handler)
    rendererControl = control
    return server
  })
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
