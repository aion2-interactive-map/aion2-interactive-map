import {createRootRoute, Outlet, Navigate} from '@tanstack/react-router'
import TopNavbar from "@/components/TopNavbar.tsx";
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// A separate component to handle the redirect logic
const NotFoundRedirect = () => {
  return <Navigate to="/" replace />;
};

const RootLayout = () => (
  <>
    <div className="h-screen w-screen flex flex-col">
      <TopNavbar/>
      <Outlet/>
    </div>
    {/*<TanStackRouterDevtools />*/}
  </>
)

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect
})