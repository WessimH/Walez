import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps
} from "@xyflow/react";

type RuntimeStatus =
  | "success"
  | "error"
  | "running"
  | "unknown";

type RuntimeEdgeData = Record<string, unknown> & {
  status?: RuntimeStatus;
};

type RuntimeEdge = Edge<RuntimeEdgeData, "bidirectional">;

function getEdgeColor(status?: RuntimeStatus): string {
  switch (status) {
    case "success":
      return "#16a34a";

    case "error":
      return "#dc2626";

    case "running":
      return "#2563eb";

    default:
      return "#94a3b8";
  }
}

function getAnimationDuration(status?: RuntimeStatus): string {
  switch (status) {
    case "running":
      return "1.15s";

    case "success":
      return "2.1s";

    case "error":
      return "1.6s";

    default:
      return "2.4s";
  }
}

export default function BidirectionalFlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerStart,
  markerEnd,
  label,
  data,
  selected,
  style
}: EdgeProps<RuntimeEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const [reversePath] = getBezierPath({
    sourceX: targetX,
    sourceY: targetY,
    sourcePosition: targetPosition,
    targetX: sourceX,
    targetY: sourceY,
    targetPosition: sourcePosition
  });

  const status = data?.status ?? "unknown";
  const edgeColor = getEdgeColor(status);
  const animationDuration = getAnimationDuration(status);
  const isActive =
    status === "success" ||
    status === "running" ||
    status === "error";

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const glowId = `edge-glow-${safeId}`;

  return (
    <>
      <defs>
        <filter
          id={glowId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur
            stdDeviation="3.5"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: selected ? 3.4 : 2.6,
          strokeLinecap: "round",
          strokeDasharray:
            status === "unknown" ? "7 7" : undefined,
          opacity: status === "unknown" ? 0.65 : 1
        }}
      />

      {isActive && (
        <>
          <path
            d={edgePath}
            fill="none"
            stroke={edgeColor}
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.12"
            pointerEvents="none"
            filter={`url(#${glowId})`}
          >
            <animate
              attributeName="opacity"
              values="0.06;0.22;0.06"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </path>

          <path
            d={edgePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeDasharray="2 14"
            opacity="0.9"
            pointerEvents="none"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-32"
              dur={animationDuration}
              repeatCount="indefinite"
            />
          </path>

          <circle
            r={status === "running" ? 5 : 4.2}
            fill={edgeColor}
            stroke="#ffffff"
            strokeWidth="1.7"
            pointerEvents="none"
            filter={`url(#${glowId})`}
          >
            <animateMotion
              dur={animationDuration}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>

          <circle
            r={status === "running" ? 5 : 4.2}
            fill={edgeColor}
            stroke="#ffffff"
            strokeWidth="1.7"
            pointerEvents="none"
            filter={`url(#${glowId})`}
          >
            <animateMotion
              dur={animationDuration}
              repeatCount="indefinite"
              path={reversePath}
            />
          </circle>
        </>
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            className={[
              "nodrag nopan rounded-full border bg-white/95",
              "px-3 py-1 text-xs font-semibold shadow-md",
              "backdrop-blur-sm transition",
              selected
                ? "border-slate-300 text-slate-900"
                : "border-slate-200 text-slate-600"
            ].join(" ")}
            style={{
              position: "absolute",
              transform:
                `translate(-50%, -50%) ` +
                `translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all"
            }}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: edgeColor,
                  boxShadow:
                    isActive
                      ? `0 0 8px ${edgeColor}`
                      : undefined
                }}
              />
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
