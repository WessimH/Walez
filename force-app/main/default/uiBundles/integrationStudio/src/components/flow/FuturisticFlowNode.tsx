import {
  Handle,
  Position,
  type Node,
  type NodeProps
} from "@xyflow/react";
import {
  Cloud,
  Code2,
  Database,
  RadioTower,
  Server,
  Workflow
} from "lucide-react";

type RuntimeStatus =
  | "success"
  | "error"
  | "running"
  | "unknown";

type FuturisticNodeData = Record<string, unknown> & {
  displayLabel?: string;
  label?: string;
  systemType?: string;
  description?: string;
  status?: RuntimeStatus;
};

type FuturisticNode = Node<FuturisticNodeData, "futuristic">;

function getSystemConfig(systemType?: string) {
  switch (systemType) {
    case "salesforce":
      return {
        accent: "#38bdf8",
        soft: "rgba(56, 189, 248, 0.14)",
        icon: Cloud,
        caption: "Salesforce"
      };

    case "apex":
      return {
        accent: "#fb923c",
        soft: "rgba(251, 146, 60, 0.14)",
        icon: Code2,
        caption: "Apex"
      };

    case "platformEvent":
      return {
        accent: "#818cf8",
        soft: "rgba(129, 140, 248, 0.14)",
        icon: RadioTower,
        caption: "Platform Event"
      };

    case "middleware":
      return {
        accent: "#c084fc",
        soft: "rgba(192, 132, 252, 0.14)",
        icon: Workflow,
        caption: "Middleware"
      };

    case "erp":
      return {
        accent: "#34d399",
        soft: "rgba(52, 211, 153, 0.14)",
        icon: Database,
        caption: "ERP"
      };

    default:
      return {
        accent: "#94a3b8",
        soft: "rgba(148, 163, 184, 0.12)",
        icon: Server,
        caption: "System"
      };
  }
}

function getStatusConfig(status?: RuntimeStatus) {
  switch (status) {
    case "success":
      return {
        label: "Succès",
        color: "#22c55e"
      };

    case "error":
      return {
        label: "Erreur",
        color: "#ef4444"
      };

    case "running":
      return {
        label: "En cours",
        color: "#38bdf8"
      };

    default:
      return {
        label: "Inconnu",
        color: "#64748b"
      };
  }
}

export default function FuturisticFlowNode({
  data,
  selected
}: NodeProps<FuturisticNode>) {
  const system = getSystemConfig(data.systemType);
  const status = getStatusConfig(data.status);
  const Icon = system.icon;

  const title =
    data.displayLabel ??
    data.label ??
    "Unnamed system";

  return (
    <div
      className={[
        "group relative min-w-[230px] overflow-hidden rounded-[20px]",
        "border px-4 py-4 backdrop-blur-2xl transition duration-300",
        selected
          ? "scale-[1.025] border-white/30"
          : "border-white/10 hover:-translate-y-0.5 hover:border-white/20"
      ].join(" ")}
      style={{
        background:
          "linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.68))",
        boxShadow: selected
          ? `0 22px 70px rgba(2, 6, 23, 0.52), 0 0 36px ${system.accent}30`
          : "0 18px 48px rgba(2, 6, 23, 0.38)"
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            `linear-gradient(90deg, transparent, ${system.accent}, transparent)`
        }}
      />

      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition duration-300 group-hover:scale-125"
        style={{
          backgroundColor: system.soft
        }}
      />

      <div className="relative z-10 flex items-center gap-3.5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            color: system.accent,
            borderColor: `${system.accent}38`,
            background:
              `linear-gradient(145deg, ${system.soft}, rgba(15, 23, 42, 0.44))`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px ${system.accent}16`
          }}
        >
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide text-white">
            {title}
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: system.accent,
                boxShadow: `0 0 8px ${system.accent}`
              }}
            />

            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {system.caption}
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full border px-2 py-1"
          style={{
            borderColor: `${status.color}30`,
            backgroundColor: `${status.color}12`,
            color: status.color
          }}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              data.status === "running"
                ? "animate-pulse"
                : ""
            ].join(" ")}
            style={{
              backgroundColor: status.color,
              boxShadow: `0 0 8px ${status.color}`
            }}
          />

          <span className="text-[10px] font-semibold uppercase tracking-wide">
            {status.label}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Integration node
        </span>

        <span
          className="h-1.5 w-12 rounded-full opacity-75"
          style={{
            background:
              `linear-gradient(90deg, transparent, ${system.accent})`
          }}
        />
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-slate-950"
        style={{
          backgroundColor: system.accent,
          boxShadow: `0 0 14px ${system.accent}`
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-slate-950"
        style={{
          backgroundColor: system.accent,
          boxShadow: `0 0 14px ${system.accent}`
        }}
      />
    </div>
  );
}
