import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { ThemeProvider, type Theme, type ThemeStorage } from '@gamemap/map-shell'
import 'leaflet/dist/leaflet.css'
import '@gamemap/map-engine/engine.css'
import './index.css'
import './i18n'
import App from './App'
import BreedingPage from './features/breeding/BreedingPage'
import PalListPage from './features/pals/PalListPage'
import PalDetailPage from './features/pals/PalDetailPage'

const THEME_KEY = 'palworld.theme'
const themeStorage: ThemeStorage = {
  get: () => {
    try {
      const v = localStorage.getItem(THEME_KEY)
      return v === 'light' || v === 'dark' || v === 'auto' ? (v as Theme) : null
    } catch {
      return null
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch { /* no storage */ }
  },
}

const rootRoute = createRootRoute({ component: () => <Outlet /> })
const mapRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: App })
export interface BreedingSearch {
  a?: string
  b?: string
  c?: string
}
const breedingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/breeding',
  // Parent A / Parent B / Child prefill, e.g. /breeding?c=Anubis
  validateSearch: (s: Record<string, unknown>): BreedingSearch => ({
    a: typeof s.a === 'string' ? s.a : undefined,
    b: typeof s.b === 'string' ? s.b : undefined,
    c: typeof s.c === 'string' ? s.c : undefined,
  }),
  component: BreedingPage,
})
const palsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pals',
  component: PalListPage,
})
const palDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pals/$id',
  component: PalDetailPage,
})
const routeTree = rootRoute.addChildren([mapRoute, breedingRoute, palsRoute, palDetailRoute])
const router = createRouter({ routeTree, basepath: import.meta.env.BASE_URL })
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="auto" storage={themeStorage}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)
