import {
  Database,
  FileJson,
  Globe,
  Home,
  KeyRound,
  Radio,
  Settings,
  Workflow,
  Zap
} from "lucide-react";

import {
  NavLink,
  type NavLinkRenderProps
} from "react-router";

const menu = [
  {
    icon: Home,
    label: "Home",
    path: "/"
  },
  {
    icon: Globe,
    label: "API Tester",
    path: "/api-tester"
  },
  {
    icon: FileJson,
    label: "JSON Formatter",
    path: "/json-formatter"
  },
  {
    icon: Zap,
    label: "Apex DTO",
    path: "/apex-dto"
  },
  {
    icon: Database,
    label: "SOQL Builder",
    path: "/soql-builder"
  },
  {
    icon: KeyRound,
    label: "Named Credentials",
    path: "/named-credentials"
  },
  {
    icon: Radio,
    label: "Platform Events",
    path: "/platform-events"
  },
  {
  icon: Workflow,
  label: "Integration Flows",
  path: "/integration-flows"
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/settings"
  }
];

export default function Sidebar() {
  return (
    <aside className="h-full w-64 border-r bg-white">
      <nav className="space-y-1 p-4">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: NavLinkRenderProps) =>
                [
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                ].join(" ")
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}