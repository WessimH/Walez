import type { RouteObject } from "react-router";

import AppLayout from "@/appLayout";
import Home from "./pages/Home";
import ApiTester from "./pages/ApiTester";
import NotFound from "./pages/NotFound";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
        handle: {
          showInNavigation: true,
          label: "Home"
        }
      },
      {
        path: "api-tester",
        element: <ApiTester />,
        handle: {
          showInNavigation: true,
          label: "API Tester"
        }
      },
      {
        path: "*",
        element: <NotFound />
      }
    ]
  }
];