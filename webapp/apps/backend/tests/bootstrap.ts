import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { createServerWithRendererControl } from '#control_plane/renderer_control_server'
import type { RendererControl } from '#control_plane/renderer_control_server'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
/**
 * The suite migrates and truncates: pointing it at the development database
 * would destroy it. Guard against a misconfigured `.env.test` rather than
 * discovering the mistake afterwards.
 */
async function assertDedicatedTestDatabase() {
  const database = app.config.get<string>('database.connections.postgres.connection.database')

  if (!database?.endsWith('_test')) {
    throw new Error(
      `Refusing to run the test suite against the "${database}" database: ` +
        `its name must end with "_test". Check DB_DATABASE in .env.test.`
    )
  }
}

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [assertDedicatedTestDatabase, () => testUtils.db().migrate()],
  teardown: [],
}

/**
 * The control plane of the functional suite's server, once started.
 */
let rendererControl: RendererControl | undefined

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  /**
   * Empty the tables between tests while keeping the schema, so every test
   * starts from a known-empty database without repeating the hook everywhere.
   */
  suite.onGroup((group) =>
    group.each.setup(async () => {
      /**
       * A presence write left by the previous test must land before the
       * migrations run: see the advisory lock note below.
       */
      await rendererControl?.idle()

      return testUtils.db().truncate()
    })
  )

  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    /**
     * Created the way `bin/server.ts` creates it, so functional tests reach the
     * control-plane WebSocket on the same server as the HTTP routes.
     */
    return suite.setup(async () => {
      let control: RendererControl | undefined

      const closeServer = await testUtils.httpServer().start((handler) => {
        const created = createServerWithRendererControl(handler)
        control = created.control
        return created.server
      })

      rendererControl = control

      /**
       * The presence reset queries the database off the request path. Every
       * test starts by running the migrations, whose advisory lock Lucid takes
       * and releases with two pooled queries: a concurrent query can make them
       * land on two connections, and the release then fails.
       */
      await control?.ready

      /**
       * Connections first: the server's close waits for every open WebSocket.
       */
      return async () => {
        await control?.close()
        await closeServer()
      }
    })
  }
}
