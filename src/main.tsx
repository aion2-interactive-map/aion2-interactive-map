import React from 'react';
import ReactDOM from 'react-dom/client';
// import 'moment';
// import 'moment/min/locales.js';

import './index.css';
import 'leaflet/dist/leaflet.css'; // Leaflet default styles
import './i18n';
// import {applyTheme} from "./utils/preTheme";

import {RouterProvider, createRouter} from '@tanstack/react-router'

// Import the generated route tree
import {routeTree} from './routeTree.gen'

// Create a new router instance
const router = createRouter({
  basepath: import.meta.env.BASE_URL,
  routeTree
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Apply initial theme
// applyTheme();

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <RouterProvider router={router}/>
    </React.StrictMode>,
  )
}
