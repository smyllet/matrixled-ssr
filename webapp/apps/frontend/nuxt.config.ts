// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || '/',
    },
  },
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt', '@nuxtjs/i18n', '@nuxtjs/color-mode'],
  shadcn: {
    prefix: 'Ui',
    componentDir: '@/components/ui',
  },
  i18n: {
    locales: [
      {
        code: 'en',
        file: 'en.json',
        name: 'English',
      },
      {
        code: 'fr',
        file: 'fr.json',
        name: 'Français',
      },
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        /**
         * `@matrixled-ssr/backend/registry` is exported as TypeScript source, and
         * its types reach into the controllers, validators and Lucid models. Those
         * files are therefore compiled as part of *this* program, and Lucid's
         * `@column`/`@belongsTo` decorators only parse under the legacy semantics
         * the backend's own tsconfig enables. Without this, a frontend typecheck
         * drowns in `TS1206: Decorators are not valid here` coming from the backend.
         */
        experimentalDecorators: true,
      },
      vueCompilerOptions: {
        checkUnknownComponents: true,
      },
    },
  },
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3333/api',
      },
      /**
       * The transmit routes are registered at the backend root, outside the
       * `/api` prefix, so they need their own entry. Without it the browser
       * would open the `EventSource` on `:3333` cross-origin, and the session
       * cookie (`httpOnly`, `sameSite: lax`) would stay behind.
       */
      '/__transmit': {
        target: 'http://localhost:3333/__transmit',
      },
    },
  },
})
