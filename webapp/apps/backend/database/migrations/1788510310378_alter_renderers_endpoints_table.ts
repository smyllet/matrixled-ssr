import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'renderers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * A renderer declares every transport it is reachable on, and the client
       * picks — Adonis never chooses for it
       * (docs/adr/0016-transports-declares-par-le-renderer.md).
       */
      table.jsonb('endpoints').nullable()
    })

    this.schema.raw(
      `UPDATE ${this.tableName} SET endpoints = to_jsonb(ARRAY[endpoint]) WHERE endpoint IS NOT NULL`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('endpoint')
    })

    /**
     * The literal mirrors `RENDERER_MAXIMUM_ENDPOINTS` on purpose: a migration
     * is a snapshot of the schema at its date and must not move when an
     * application constant does.
     *
     * The check stops at the type and the length of the list. Bounding each
     * entry — its scheme, its length — is not expressible here, since
     * PostgreSQL forbids set-returning functions inside a CHECK constraint.
     * That half of the bound lives in app/validators/renderer.ts.
     */
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT renderers_endpoints_bounded_check CHECK (endpoints IS NULL OR (jsonb_typeof(endpoints) = 'array' AND jsonb_array_length(endpoints) BETWEEN 1 AND 4))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS renderers_endpoints_bounded_check`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.string('endpoint').nullable()
    })

    /**
     * Only the first entry survives the trip back — the singular column has
     * nowhere to put the others.
     */
    this.schema.raw(
      `UPDATE ${this.tableName} SET endpoint = endpoints->>0 WHERE endpoints IS NOT NULL`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('endpoints')
    })
  }
}
