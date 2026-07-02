import { Outlet } from "react-router";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import AiAssistantLauncher from "./components/AiAssistantLauncher";

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <AiAssistantLauncher />
    </div>
  );
}
