export interface BreadcrumbEntry {
  /** i18n key of the label to display. */
  label: string
  /** Path to link to. The last entry of a trail is never linked. */
  to?: string
}

declare module '#app' {
  interface PageMeta {
    breadcrumb?: BreadcrumbEntry[]
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    breadcrumb?: BreadcrumbEntry[]
  }
}
