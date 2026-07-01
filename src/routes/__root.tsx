import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/context/ThemeContext";
import { GameMapProvider } from "@/context/GameMapContext";
import { MarkersProvider } from "@/context/MarkersContext";
import { GameDataProvider } from "@/context/GameDataContext";
import { ThemeMapBridge } from "@/context/ThemeMapBridge";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <GameMapProvider>
        <ThemeMapBridge />
        <MarkersProvider>
          <GameDataProvider>
            <Outlet />
          </GameDataProvider>
        </MarkersProvider>
      </GameMapProvider>
    </ThemeProvider>
  ),
});
