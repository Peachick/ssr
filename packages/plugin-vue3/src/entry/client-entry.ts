import * as Vue from 'vue'
import { h, createApp } from 'vue'
import { findRoute } from 'ssr-client-utils'
import { FeRouteItem } from 'ssr-types'
import { createRouter } from './router'
import { createStore } from './store'

declare const module: any
const feRoutes = require('ssr-temporary-routes/route')

const App = feRoutes[0].App
const clientRender = async () => {
  const store = createStore()
  const router = createRouter()

  if (window.__INITIAL_DATA__) {
    store.replaceState(window.__INITIAL_DATA__)
  }

  const app = createApp({
    render: () => h(App)
  })

  app.use(store)
  app.use(router)
  // @ts-expect-error
  if (vueI18N?.enable) {
    const { i18n } = require('./i18n')
    app.use(i18n)
  }

  await router.isReady()

  if (!window.__USE_SSR__) {
    // 如果是 csr 模式 则需要客户端获取首页需要的数据
    const route = findRoute<FeRouteItem<{}, {
      App: Vue.Component
      layout: Vue.Component
    }>>(feRoutes, location.pathname)

    const { fetch } = route

    if (fetch) {
      await fetch({ store, router: router.currentRoute })
    }
  }
  router.beforeResolve(async (to, from, next) => {
    // 找到要进入的组件并提前执行 fetch 函数
    const route = findRoute<FeRouteItem<{}, {
      App: Vue.Component
      layout: Vue.Component
    }>>(feRoutes, to.path)

    if (route.fetch) {
      await route.fetch({ store, router: to })
    }
    next()
  })

  app.mount('#app', !!window.__USE_SSR__) // 这里需要做判断 ssr/csr 来为 true/false

  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept()
  }
}

export default clientRender()