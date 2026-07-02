import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "./i18n";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ basepath: import.meta.env.BASE_URL, routeTree });
declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
