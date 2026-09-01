import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    renderers: {
      columns: {
        /**
         * The transformers decide what an endpoint exposes, but a token
         * fingerprint must not be able to leak through a stray serialization
         * either. Same treatment as `users.password`.
         */
        token_hash: {
          tsType: 'string',
          decorators: [{ name: '@column', args: { serializeAs: null } }],
        },
        /**
         * The generator maps every enum to `string`; narrowing it here keeps
         * the union the migration declares.
         */
        status: {
          tsType: "'online' | 'offline'",
          decorators: [{ name: '@column' }],
        },
      },
    },
    scenes: {
      columns: {
        /**
         * The generator can't infer the versioned envelope from a jsonb
         * column; this keeps `Scene.config` typed instead of `any`.
         */
        config: {
          tsType: 'SceneConfig',
          decorators: [{ name: '@column' }],
          imports: [{ source: '#validators/scene', typeImports: ['SceneConfig'] }],
        },
      },
    },
  },
} satisfies SchemaRules
