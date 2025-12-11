import {createRootRoute, Outlet, Navigate} from '@tanstack/react-router'
import TopNavbar from "@/components/TopNavbar.tsx";
import {SiteConfigProvider} from "@/context/SiteConfigContext.tsx";
import {UserProvider} from "@/context/UserContext.tsx";
import {DataModeProvider} from "@/hooks/useDataMode.tsx";
import {GameMapProvider} from "@/context/GameMapContext.tsx";
import {ThemeProvider} from "@/context/ThemeContext.tsx";
import {HeroUIProvider} from "@heroui/react";
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// A separate component to handle the redirect logic
const NotFoundRedirect = () => {
  return <Navigate to="/" replace/>;
};

const RootLayout = () => (
  <>
    <SiteConfigProvider>
      <UserProvider>
        <DataModeProvider>
          <GameMapProvider>
            <ThemeProvider>
              <HeroUIProvider>
                <div className="h-screen w-screen flex flex-col">
                  <TopNavbar/>
                  <Outlet/>
                </div>
              </HeroUIProvider>
            </ThemeProvider>
          </GameMapProvider>
        </DataModeProvider>
      </UserProvider>
    </SiteConfigProvider>
    {/*<TanStackRouterDevtools />*/}
  </>
)

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect
})