import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';

import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css'; // Leaflet default styles
import './i18n';
import { applyTheme } from "./utils/preTheme";

applyTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* You can pass locale/theme props later if you like */}
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>,
);
