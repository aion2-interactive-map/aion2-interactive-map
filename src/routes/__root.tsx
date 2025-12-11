import {createRootRoute, Outlet, Navigate} from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// A separate component to handle the redirect logic
const NotFoundRedirect = () => {
  return <Navigate to="/" replace />;
};

const RootLayout = () => (
  <>
    {/*<div className="p-2 flex gap-2">*/}
    {/*  <Link to="/" className="[&.active]:font-bold">*/}
    {/*    Home*/}
    {/*  </Link>{' '}*/}
    {/*  <Link to="/map" className="[&.active]:font-bold">*/}
    {/*    Map*/}
    {/*  </Link>*/}
    {/*</div>*/}
    {/*<hr />*/}
    <Outlet/>
    {/*<TanStackRouterDevtools />*/}
  </>
)

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect
})