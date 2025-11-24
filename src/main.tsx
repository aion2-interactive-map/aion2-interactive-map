import React from 'react';
import ReactDOM from 'react-dom/client';
import {HeroUIProvider} from '@heroui/react';

import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css'; // Leaflet default styles
import './i18n';
import {applyTheme} from "./utils/preTheme";
import {DataModeProvider} from "./hooks/useDataMode";
import {ThemeProvider} from "@/context/ThemeContext";
import {GameDataProvider} from "@/context/GameDataContext.tsx";
import {GameMapProvider} from "@/context/GameMapContext.tsx";
import {MarkersProvider} from "@/context/MarkersContext.tsx";

applyTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* You can pass locale/theme props later if you like */}
    <ThemeProvider>
    <HeroUIProvider>
        <DataModeProvider>
          <GameMapProvider>
            <MarkersProvider>
              <GameDataProvider>
                <App/>
              </GameDataProvider>
            </MarkersProvider>
          </GameMapProvider>
        </DataModeProvider>
    </HeroUIProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
