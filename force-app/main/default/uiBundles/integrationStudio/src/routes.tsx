import type { RouteObject } from "react-router";
import AppLayout from "@/appLayout";
import Home from "./pages/Home";
import ApiTester from "./pages/ApiTester";
import NotFound from "./pages/NotFound";
import JsonFormatter from "./pages/JsonFormatter";
import ApexDtoGenerator from "./pages/ApexDtoGenerator";
import SoqlBuilder from "./pages/SoqlBuilder";
import NamedCredentialExplorer from "./pages/NamedCredentialExplorer";
import PlatformEventExplorer from "./pages/PlatformEventExplorer";
import Settings from "./pages/Settings";
import IntegrationFlowVisualizer from "./pages/IntegrationFlowVisualizer";

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
      path: "json-formatter",
      element: <JsonFormatter />,
      handle: {
        showInNavigation: true,
        label: "JSON Formatter"
      }
    },
    {
  path: "apex-dto",
  element: <ApexDtoGenerator />,
  handle: {
    showInNavigation: true,
    label: "Apex DTO"
  }
},
{
  path: "soql-builder",
  element: <SoqlBuilder />,
  handle: {
    showInNavigation: true,
    label: "SOQL Builder"
  }
},
{
  path: "named-credentials",
  element: <NamedCredentialExplorer />,
  handle: {
    showInNavigation: true,
    label: "Named Credentials"
  }
},
{
  path: "platform-events",
  element: <PlatformEventExplorer />,
  handle: {
    showInNavigation: true,
    label: "Platform Events"
  }
},
{
  path: "settings",
  element: <Settings />,
  handle: {
    showInNavigation: true,
    label: "Settings"
  }
},
{
  path: "integration-flows",
  element: <IntegrationFlowVisualizer />,
  handle: {
    showInNavigation: true,
    label: "Integration Flows"
  }
},

      {
        path: "*",
        element: <NotFound />
      }
    ]
  }
];