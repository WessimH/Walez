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

type RuntimeEdge = Edge<RuntimeEdgeData, "animated">;

function getEdgeColor(status?: RuntimeStatus): string {
  switch (status) {
    case "success":
      return "#22c55e";

    case "error":
      return "#ef4444";

    case "running":
      return "#38bdf8";

    default:
      return "#64748b";
  }
}

function getAnimationDuration(status?: RuntimeStatus): string {
  switch (status) {
    case "running":
      return "1.05s";

    case "success":
      return "1.9s";

    case "error":
      return "1.35s";

    default:
      return "2.5s";
  }
}

export default function AnimatedFlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
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
    targetPosition,
    curvature: 0.42
  });

  const status = data?.status ?? "unknown";
  const edgeColor = getEdgeColor(status);
  const animationDuration = getAnimationDuration(status);

  const isActive =
    status === "success" ||
    status === "running" ||
    status === "error";

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const glowId = `animated-edge-glow-${safeId}`;
  const gradientId = `animated-edge-gradient-${safeId}`;

  return (
    <>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop
            offset="0%"
            stopColor={edgeColor}
            stopOpacity="0.55"
          />

          <stop
            offset="48%"
            stopColor={edgeColor}
            stopOpacity="1"
          />

          <stop
            offset="100%"
            stopColor={edgeColor}
            stopOpacity="0.72"
          />
        </linearGradient>

        <filter
          id={glowId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur
            stdDeviation="4"
            result="blur"
          />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={selected ? 11 : 8}
        strokeLinecap="round"
        opacity={selected ? 0.15 : 0.08}
        pointerEvents="none"
        filter={`url(#${glowId})`}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth: selected ? 3.4 : 2.6,
          strokeLinecap: "round",
          strokeDasharray:
            status === "unknown" ? "8 8" : undefined,
          opacity: status === "unknown" ? 0.65 : 1
        }}
      />

      {isActive && (
        <>
          <path
            d={edgePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeDasharray="2 15"
            opacity="0.82"
            pointerEvents="none"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-34"
              dur={animationDuration}
              repeatCount="indefinite"
            />
          </path>

          <circle
            r={status === "running" ? 5 : 4.3}
            fill={edgeColor}
            stroke="#ffffff"
            strokeWidth="1.8"
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
            r="2.1"
            fill="#ffffff"
            pointerEvents="none"
            opacity="0.95"
          >
            <animateMotion
              begin="-0.65s"
              dur={animationDuration}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
        </>
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            className={[
              "nodrag nopan rounded-full border px-3 py-1.5",
              "text-xs font-semibold shadow-xl backdrop-blur-xl",
              "transition duration-200",
              selected
                ? "border-white/30 bg-slate-900/90 text-white"
                : "border-slate-400/20 bg-slate-950/75 text-slate-200"
            ].join(" ")}
            style={{
              position: "absolute",
              transform:
                `translate(-50%, -50%) ` +
                `translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              boxShadow:
                `0 10px 30px rgba(2, 6, 23, 0.42), ` +
                `0 0 20px ${edgeColor}20`
            }}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: edgeColor,
                  boxShadow:
                    isActive
                      ? `0 0 10px ${edgeColor}`
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
