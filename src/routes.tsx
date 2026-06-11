import { FileRoutesByPath, RootRoute, RootRouteWithContext } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as playRoute } from './routes/play'
import { Route as learnRoute } from './routes/learn'

// Create route tree
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof indexRoute
      parentRoute: typeof rootRoute
    }
    '/play': {
      id: '/play'
      path: '/play'
      fullPath: '/play'
      preLoaderRoute: typeof playRoute
      parentRoute: typeof rootRoute
    }
    '/learn': {
      id: '/learn'
      path: '/learn'
      fullPath: '/learn'
      preLoaderRoute: typeof learnRoute
      parentRoute: typeof rootRoute
    }
  }
}

export const routeTree = rootRoute.addChildren([
  indexRoute,
  playRoute,
  learnRoute,
])
