import { createInertiaApp } from '@inertiajs/vue3'
import { renderToString } from '@vue/server-renderer'
import PrimeVue from 'primevue/config'
import { createSSRApp, h, type DefineComponent } from 'vue'
import ConfirmationService from 'primevue/confirmationservice'

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: renderToString,
    resolve: (name) => {
      const pages = import.meta.glob<DefineComponent>('../pages/**/*.vue', { eager: true })
      return pages[`../pages/${name}.vue`]
    },

    setup({ App, props, plugin }) {
      return createSSRApp({ render: () => h(App, props) })
        .use(plugin)
        .use(PrimeVue)
        .use(ConfirmationService)
    },
  })
}
