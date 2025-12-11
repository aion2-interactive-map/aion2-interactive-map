import React from 'react';
import ReactDOM from 'react-dom/client';
import {HeroUIProvider} from '@heroui/react';

import './index.css';
import 'leaflet/dist/leaflet.css'; // Leaflet default styles
import './i18n';
import {applyTheme} from "./utils/preTheme";
import {DataModeProvider} from "./hooks/useDataMode";
import {ThemeProvider} from "@/context/ThemeContext";
import {GameMapProvider} from "@/context/GameMapContext.tsx";
import {UserProvider} from "@/context/UserContext";
import {SiteConfigProvider} from "@/context/SiteConfigContext.tsx";

import {RouterProvider, createRouter} from '@tanstack/react-router'

// Import the generated route tree
import {routeTree} from './routeTree.gen'

// Create a new router instance
const router = createRouter({routeTree})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Apply initial theme
applyTheme();

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <SiteConfigProvider>
        <UserProvider>
          <DataModeProvider>
            <GameMapProvider>
              <ThemeProvider>
                <HeroUIProvider>
                  <RouterProvider router={router}/>
                </HeroUIProvider>
              </ThemeProvider>
            </GameMapProvider>
          </DataModeProvider>
        </UserProvider>
      </SiteConfigProvider>
    </React.StrictMode>,
  )
}
