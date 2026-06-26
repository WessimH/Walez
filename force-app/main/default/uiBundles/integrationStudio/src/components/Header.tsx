import { Wrench } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Wrench className="h-6 w-6 text-blue-600" />

        <div>
          <h1 className="text-lg font-semibold">
            Salesforce Integration Studio
          </h1>

          <p className="text-xs text-gray-500">
            Developer Toolkit
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />

        <span className="text-sm text-gray-600">
          Connected
        </span>
      </div>
    </header>
  );
}