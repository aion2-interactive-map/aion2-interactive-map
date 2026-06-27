import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/context/ThemeContext";
import { GameMapProvider } from "@/context/GameMapContext";
import { MarkersProvider } from "@/context/MarkersContext";
import { GameDataProvider } from "@/context/GameDataContext";
import { UserMarkersProvider } from "@/context/UserMarkersContext";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <GameMapProvider>
        <MarkersProvider>
          <GameDataProvider>
            <UserMarkersProvider>
              <Outlet />
            </UserMarkersProvider>
          </GameDataProvider>
        </MarkersProvider>
      </GameMapProvider>
    </ThemeProvider>
  ),
});
