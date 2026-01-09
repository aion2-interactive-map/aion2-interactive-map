import {createRootRoute, Outlet, Navigate} from '@tanstack/react-router'
import TopNavbar from "@/components/TopNavbar.tsx";
import {SiteConfigProvider} from "@/context/SiteConfigContext.tsx";
import {UserProvider} from "@/context/UserContext.tsx";
import {DataModeProvider} from "@/hooks/useDataMode.tsx";
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
          <ThemeProvider>
            <HeroUIProvider>
              <div className="h-screen w-screen flex flex-col overflow-hidden">
                <TopNavbar />
                {/* IMPORTANT: min-h-0 allows children to scroll */}
                <div className="flex-1 min-h-0">
                  <Outlet />
                </div>
              </div>
            </HeroUIProvider>
          </ThemeProvider>
        </DataModeProvider>
      </UserProvider>
    </SiteConfigProvider>
    {/*<TanStackRouterDevtools />*/}
  </>
);


export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect
})