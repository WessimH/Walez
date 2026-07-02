import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode
} from "react";
import { createDataSDK } from "@salesforce/platform-sdk";
import AnimatedFlowEdge from "../components/flow/AnimatedFlowEdge";
import BidirectionalFlowEdge from "../components/flow/BidirectionalFlowEdge";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange
} from "@xyflow/react";
import {
  Activity,
  Box,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  Server,
  Workflow
} from "lucide-react";
import "./FlowCanvas.css";
import FuturisticFlowNode from "../components/flow/FuturisticFlowNode";
import { mergeState } from "../utils/state";

type FlowDefinition = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  diagramJson: string | null;
  active: boolean;
  createdDate: string;
  lastModifiedDate: string;
};

type FlowListResponse = {
  totalSize: number;
  flows: FlowDefinition[];
};

type LayoutUpdateResponse = {
  success: boolean;
  updatedNodes: number;
  savedAt: string;
};

type DiagramSourceNodeData = Record<string, unknown> & {
  label?: string;
  systemType?: string;
  description?: string;
};

type FlowNodeData = Record<string, unknown> & {
  label: ReactNode;
  displayLabel: string;
  systemType?: string;
  description?: string;
};

type FlowNode = Node<FlowNodeData>;

type DiagramEdgeType = "animated" | "bidirectional";

type ExchangeType =
  | "requestResponse"
  | "event"
  | "webhook"
  | "batch"
  | "file"
  | "database";

type RuntimeStatus =
  | "success"
  | "error"
  | "running"
  | "unknown";

type FlowEdgeData = Record<string, unknown> & {
  exchangeType?: ExchangeType;
  protocol?: string;
  method?: string;
  endpoint?: string;
  requestLabel?: string;
  responseLabel?: string;
  status?: RuntimeStatus;
  lastExecutionDate?: string;
  durationMs?: number;
  correlationId?: string;
  errorMessage?: string;
};

type FlowEdge = Edge<FlowEdgeData>;

type DiagramDefinition = {
  nodes: Array<{
    id: string;
    type?: string;
    position: {
      x: number;
      y: number;
    };
    data: DiagramSourceNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
    type?: DiagramEdgeType;
    data?: FlowEdgeData;
  }>;
};

type DiagramValidationResult = {
  errors: string[];
  warnings: string[];
};

type DiagramParseResult = {
  diagram: DiagramDefinition;
  parseError?: string;
};

type RuntimeSummary = {
  total: number;
  success: number;
  error: number;
  running: number;
  unknown: number;
};

type IntegrationFlowState = {
  duration: number | null;
  error: string;
  flows: FlowDefinition[];
  layoutSaveError: string;
  layoutSaveMessage: string;
  layoutSaving: boolean;
  loading: boolean;
  selectedEdge: FlowEdge | null;
  selectedFlowId: string;
  selectedNode: FlowNode | null;
  validation: DiagramValidationResult;
};

const FLOWS_ENDPOINT = "/services/apexrest/integration-studio/flows-runtime";


const edgeTypes = {
  animated: AnimatedFlowEdge,
  bidirectional: BidirectionalFlowEdge
};

const EMPTY_DIAGRAM: DiagramDefinition = {
  nodes: [],
  edges: []
};

const EMPTY_VALIDATION: DiagramValidationResult = {
  errors: [],
  warnings: []
};

const VALID_RUNTIME_STATUSES = new Set([
  "success",
  "error",
  "running",
  "unknown"
]);

const INITIAL_INTEGRATION_FLOW_STATE: IntegrationFlowState = {
  duration: null,
  error: "",
  flows: [],
  layoutSaveError: "",
  layoutSaveMessage: "",
  layoutSaving: false,
  loading: false,
  selectedEdge: null,
  selectedFlowId: "",
  selectedNode: null,
  validation: EMPTY_VALIDATION
};

const nodeTypes = {
  futuristic: FuturisticFlowNode
};

const RUNTIME_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium"
});

function extractErrorMessage(
  rawResponse: string,
  status: number
): string {
  try {
    const parsed: unknown = JSON.parse(rawResponse);

    if (
      Array.isArray(parsed) &&
      typeof parsed[0]?.message === "string"
    ) {
      return parsed[0].message;
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      return parsed.message;
    }
  } catch {
    if (rawResponse.trim()) {
      return rawResponse;
    }
  }

  return `Erreur Salesforce HTTP ${status}`;
}

function parseDiagram(
  diagramJson: string | null
): DiagramParseResult {
  if (!diagramJson?.trim()) {
    return {
      diagram: EMPTY_DIAGRAM
    };
  }

  try {
    const parsed = JSON.parse(
      diagramJson
    ) as Partial<DiagramDefinition>;

    return {
      diagram: {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : []
      }
    };
  } catch (currentError) {
    return {
      diagram: EMPTY_DIAGRAM,
      parseError:
        currentError instanceof Error
          ? `JSON invalide : ${currentError.message}`
          : "Le Diagram JSON est invalide."
    };
  }
}

function updateDiagramNodePosition(
  diagramJson: string | null,
  nodeId: string,
  position: {
    x: number;
    y: number;
  }
): string | null {
  if (!diagramJson?.trim()) {
    return diagramJson;
  }

  try {
    const parsed = JSON.parse(
      diagramJson
    ) as Partial<DiagramDefinition>;

    if (!Array.isArray(parsed.nodes)) {
      return diagramJson;
    }

    const updatedNodes = parsed.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            position
          }
        : node
    );

    return JSON.stringify({
      ...parsed,
      nodes: updatedNodes
    });
  } catch {
    return diagramJson;
  }
}

function validateDiagram(
  diagram: DiagramDefinition
): DiagramValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  if (diagram.nodes.length === 0) {
    warnings.push("Le diagramme ne contient aucun nœud.");
  }

  for (const node of diagram.nodes) {
    const nodeId =
      typeof node.id === "string" ? node.id.trim() : "";

    if (!nodeId) {
      errors.push("Un nœud possède un identifiant vide.");
      continue;
    }

    if (nodeIds.has(nodeId)) {
      errors.push(`Identifiant de nœud dupliqué : ${nodeId}`);
    }

    nodeIds.add(nodeId);

    if (
      !Number.isFinite(node.position?.x) ||
      !Number.isFinite(node.position?.y)
    ) {
      errors.push(`Position invalide pour le nœud : ${nodeId}`);
    }

    if (
      typeof node.data?.label !== "string" ||
      !node.data.label.trim()
    ) {
      warnings.push(
        `Le nœud ${nodeId} ne possède pas de libellé.`
      );
    }

    if (
      typeof node.data?.systemType !== "string" ||
      !node.data.systemType.trim()
    ) {
      warnings.push(
        `Le nœud ${nodeId} ne possède pas de type système.`
      );
    }
  }

  for (const edge of diagram.edges) {
    const edgeId =
      typeof edge.id === "string" ? edge.id.trim() : "";
    const source =
      typeof edge.source === "string" ? edge.source.trim() : "";
    const target =
      typeof edge.target === "string" ? edge.target.trim() : "";

    if (!edgeId) {
      errors.push("Une flèche possède un identifiant vide.");
      continue;
    }

    if (edgeIds.has(edgeId)) {
      errors.push(`Identifiant de flèche dupliqué : ${edgeId}`);
    }

    edgeIds.add(edgeId);

    if (!source) {
      errors.push(`La flèche ${edgeId} ne possède pas de source.`);
    } else if (!nodeIds.has(source)) {
      errors.push(`Source inexistante pour ${edgeId} : ${source}`);
    }

    if (!target) {
      errors.push(`La flèche ${edgeId} ne possède pas de cible.`);
    } else if (!nodeIds.has(target)) {
      errors.push(`Cible inexistante pour ${edgeId} : ${target}`);
    }

    if (source && target && source === target) {
      warnings.push(
        `La flèche ${edgeId} revient vers le même nœud.`
      );
    }

    if (edge.type === "bidirectional") {
      if (!edge.data?.requestLabel?.trim()) {
        warnings.push(
          `Le flux bidirectionnel ${edgeId} ne décrit pas sa requête.`
        );
      }

      if (!edge.data?.responseLabel?.trim()) {
        warnings.push(
          `Le flux bidirectionnel ${edgeId} ne décrit pas sa réponse.`
        );
      }
    }

    if (!edge.data?.exchangeType) {
      warnings.push(
        `Le type d’échange du flux ${edgeId} n’est pas renseigné.`
      );
    }

    if (!edge.data?.protocol?.trim()) {
      warnings.push(
        `Le protocole du flux ${edgeId} n’est pas renseigné.`
      );
    }

    if (
      edge.data?.status &&
      !VALID_RUNTIME_STATUSES.has(edge.data.status)
    ) {
      warnings.push(
        `Le statut d’exécution du flux ${edgeId} est inconnu.`
      );
    }

    const durationMs = edge.data?.durationMs;

    if (
      durationMs !== undefined &&
      (!Number.isFinite(durationMs) || durationMs < 0)
    ) {
      warnings.push(
        `La durée d’exécution du flux ${edgeId} est invalide.`
      );
    }
  }

  return {
    errors,
    warnings
  };
}

function getNodeAppearance(systemType?: string) {
  switch (systemType) {
    case "salesforce":
      return {
        background: "#eff6ff",
        border: "#60a5fa",
        color: "#1d4ed8"
      };

    case "apex":
      return {
        background: "#fff7ed",
        border: "#fb923c",
        color: "#c2410c"
      };

    case "platformEvent":
      return {
        background: "#eef2ff",
        border: "#818cf8",
        color: "#4338ca"
      };

    case "middleware":
      return {
        background: "#faf5ff",
        border: "#c084fc",
        color: "#7e22ce"
      };

    case "erp":
      return {
        background: "#ecfdf5",
        border: "#34d399",
        color: "#047857"
      };

    default:
      return {
        background: "#f9fafb",
        border: "#9ca3af",
        color: "#374151"
      };
  }
}

function getSystemIcon(systemType?: string) {
  switch (systemType) {
    case "salesforce":
      return Cloud;

    case "apex":
      return Code2;

    case "platformEvent":
      return RadioTower;

    case "middleware":
      return Workflow;

    case "erp":
      return Database;

    default:
      return Server;
  }
}

function getRuntimeStatusLabel(status?: RuntimeStatus): string {
  switch (status) {
    case "success":
      return "Succès";

    case "error":
      return "Erreur";

    case "running":
      return "En cours";

    default:
      return "Non renseigné";
  }
}

function getRuntimeStatusClasses(status?: RuntimeStatus): string {
  switch (status) {
    case "success":
      return "border-green-200 bg-green-50 text-green-800";

    case "error":
      return "border-red-200 bg-red-50 text-red-800";

    case "running":
      return "border-blue-200 bg-blue-50 text-blue-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getRuntimeStatusDot(status?: RuntimeStatus): string {
  switch (status) {
    case "success":
      return "bg-green-500";

    case "error":
      return "bg-red-500";

    case "running":
      return "bg-blue-500 animate-pulse";

    default:
      return "bg-slate-400";
  }
}

function getRuntimeEdgeColor(status?: RuntimeStatus): string {
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

function formatRuntimeDate(value?: string): string {
  if (!value?.trim()) {
    return "Non renseignée";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return RUNTIME_DATE_FORMATTER.format(parsedDate);
}

function formatDuration(durationMs?: number): string {
  if (!Number.isFinite(durationMs) || durationMs === undefined) {
    return "Non renseignée";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function IntegrationHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
        <Workflow size={24} />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Integration Flow Visualizer
        </h2>

        <p className="mt-1 text-gray-500">
          Visualise les flux de données entre Salesforce, middleware,
          API et ERP.
        </p>
      </div>
    </div>
  );
}

type FlowSelectorCardProps = {
  duration: number | null;
  flows: FlowDefinition[];
  layoutSaveError: string;
  layoutSaveMessage: string;
  layoutSaving: boolean;
  loading: boolean;
  selectedFlow: FlowDefinition | null;
  selectedFlowId: string;
  onFlowChange: (flowId: string) => void;
  onRefresh: () => void;
};

function FlowSelectorCard({
  duration,
  flows,
  layoutSaveError,
  layoutSaveMessage,
  layoutSaving,
  loading,
  selectedFlow,
  selectedFlowId,
  onFlowChange,
  onRefresh
}: FlowSelectorCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label
            htmlFor="integration-flow-selector"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Intégration
          </label>

          <select
            id="integration-flow-selector"
            value={selectedFlowId}
            onChange={(event) =>
              onFlowChange(event.target.value)
            }
            disabled={loading || flows.length === 0}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 disabled:bg-gray-100"
          >
            {flows.length === 0 && (
              <option value="">
                Aucune intégration disponible
              </option>
            )}

            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <RefreshCw size={17} />
          )}

          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>{flows.length} intégration(s)</span>

        {duration !== null && <span>{duration} ms</span>}

        {selectedFlow?.active && (
          <span className="flex items-center gap-1 text-green-700">
            <CheckCircle2 size={14} />
            Active
          </span>
        )}

        {layoutSaving && (
          <span className="text-blue-700">
            Enregistrement de la disposition...
          </span>
        )}

        {!layoutSaving && layoutSaveMessage && (
          <span className="flex items-center gap-1 text-green-700">
            <CheckCircle2 size={14} />
            {layoutSaveMessage}
          </span>
        )}

        {!layoutSaving && layoutSaveError && (
          <span className="text-red-700">
            {layoutSaveError}
          </span>
        )}
      </div>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
      {message}
    </div>
  );
}

function SelectedFlowSummary({
  flow
}: {
  flow: FlowDefinition;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {flow.name}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            {flow.description || "Aucune description disponible."}
          </p>
        </div>

        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
          {flow.status || "Unknown"}
        </span>
      </div>
    </section>
  );
}

function RuntimeSummaryPanel({
  runtimeSummary
}: {
  runtimeSummary: RuntimeSummary;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            État des échanges
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Dernier statut déclaré pour chaque flux du diagramme.
          </p>
        </div>

        <span className="text-xs text-gray-500">
          {runtimeSummary.total} flux
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-800">
              Succès
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-green-900">
            {runtimeSummary.success}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-800">
              Erreur
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-red-900">
            {runtimeSummary.error}
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-800">
              En cours
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-blue-900">
            {runtimeSummary.running}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span className="text-xs font-medium text-slate-700">
              Non renseigné
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {runtimeSummary.unknown}
          </p>
        </div>
      </div>
    </section>
  );
}

function ValidationPanel({
  validation
}: {
  validation: DiagramValidationResult;
}) {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <section
      className={`rounded-xl border p-4 ${
        hasErrors
          ? "border-red-200 bg-red-50"
          : hasWarnings
            ? "border-amber-200 bg-amber-50"
            : "border-green-200 bg-green-50"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3
            className={`font-semibold ${
              hasErrors
                ? "text-red-800"
                : hasWarnings
                  ? "text-amber-800"
                  : "text-green-800"
            }`}
          >
            {hasErrors
              ? "Diagramme invalide"
              : hasWarnings
                ? "Diagramme valide avec avertissements"
                : "Diagramme valide"}
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            {validation.errors.length} erreur(s) ·{" "}
            {validation.warnings.length} avertissement(s)
          </p>
        </div>

        {!hasErrors && !hasWarnings && (
          <CheckCircle2
            size={22}
            className="shrink-0 text-green-700"
          />
        )}
      </div>

      {hasErrors && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Erreurs
          </p>

          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {validation.errors.map((validationError, index) => (
              <li key={`${validationError}-${index}`}>
                • {validationError}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasWarnings && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Avertissements
          </p>

          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {validation.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EmptyDiagramState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Activity size={42} className="text-gray-300" />

      <h3 className="mt-4 font-semibold text-gray-800">
        Aucun diagramme disponible
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        Charge une intégration contenant un Diagram JSON.
      </p>
    </div>
  );
}

function FlowLegendPanel({
  runtimeSummary,
  selectedFlow
}: {
  runtimeSummary: RuntimeSummary;
  selectedFlow: FlowDefinition | null;
}) {
  return (
    <Panel
      position="top-left"
      className="flow-glass-panel !m-4 w-[270px] rounded-2xl p-4 text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Live architecture
          </p>

          <h4 className="mt-1 text-sm font-semibold text-white">
            {selectedFlow?.name ?? "Integration flow"}
          </h4>
        </div>

        <span className="flow-live-badge text-[10px] font-semibold uppercase tracking-wide">
          Live
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.035] p-2 text-center">
          <p className="text-lg font-bold text-white">
            {runtimeSummary.total}
          </p>

          <p className="text-[9px] uppercase tracking-wide text-slate-500">
            Flux
          </p>
        </div>

        <div className="rounded-xl border border-green-400/10 bg-green-400/[0.05] p-2 text-center">
          <p className="text-lg font-bold text-green-400">
            {runtimeSummary.success}
          </p>

          <p className="text-[9px] uppercase tracking-wide text-slate-500">
            OK
          </p>
        </div>

        <div className="rounded-xl border border-red-400/10 bg-red-400/[0.05] p-2 text-center">
          <p className="text-lg font-bold text-red-400">
            {runtimeSummary.error}
          </p>

          <p className="text-[9px] uppercase tracking-wide text-slate-500">
            Erreur
          </p>
        </div>

        <div className="rounded-xl border border-blue-400/10 bg-blue-400/[0.05] p-2 text-center">
          <p className="text-lg font-bold text-sky-400">
            {runtimeSummary.running}
          </p>

          <p className="text-[9px] uppercase tracking-wide text-slate-500">
            Live
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-white/5 pt-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            Salesforce
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
            Apex
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
            Middleware
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            ERP
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
          <span className="font-mono text-sky-400">──▶</span>
          Unidirectionnel
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
          <span className="font-mono text-violet-400">◀─▶</span>
          Bidirectionnel
        </div>
      </div>
    </Panel>
  );
}

type FlowCanvasPanelProps = {
  edges: FlowEdge[];
  nodes: FlowNode[];
  runtimeSummary: RuntimeSummary;
  selectedFlow: FlowDefinition | null;
  onEdgeClick: EdgeMouseHandler<FlowEdge>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onNodeClick: NodeMouseHandler<FlowNode>;
  onNodeDragStop: OnNodeDrag<FlowNode>;
  onNodesChange: OnNodesChange<FlowNode>;
  onPaneClick: () => void;
};

function FlowCanvasPanel({
  edges,
  nodes,
  runtimeSummary,
  selectedFlow,
  onEdgeClick,
  onEdgesChange,
  onNodeClick,
  onNodeDragStop,
  onNodesChange,
  onPaneClick
}: FlowCanvasPanelProps) {
  return (
    <section className="integration-flow-shell h-[650px]">
      {nodes.length === 0 ? (
        <EmptyDiagramState />
      ) : (
        <div className="relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.35}
            maxZoom={1.8}
          >
            <Background
              gap={32}
              size={1}
              color="rgba(148, 163, 184, 0.22)"
            />

            <FlowLegendPanel
              runtimeSummary={runtimeSummary}
              selectedFlow={selectedFlow}
            />

            <Controls />

            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                switch (node.data?.systemType) {
                  case "salesforce":
                    return "#3b82f6";
                  case "apex":
                    return "#f97316";
                  case "middleware":
                    return "#a855f7";
                  case "erp":
                    return "#10b981";
                  default:
                    return "#64748b";
                }
              }}
              maskColor="rgba(2, 6, 23, 0.72)"
            />
          </ReactFlow>
        </div>
      )}
    </section>
  );
}

function EdgeDetails({ edge }: { edge: FlowEdge }) {
  return (
    <div className="space-y-5 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Flux
        </p>

        <p className="mt-1 font-semibold text-gray-900">
          {edge.label ?? `${edge.source} → ${edge.target}`}
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 ${getRuntimeStatusClasses(
          edge.data?.status
        )}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${getRuntimeStatusDot(
                edge.data?.status
              )}`}
            />

            <span className="text-sm font-semibold">
              {getRuntimeStatusLabel(edge.data?.status)}
            </span>
          </div>

          <span className="text-xs font-medium uppercase tracking-wide opacity-70">
            Exécution
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Type d’échange
        </p>

        <p className="mt-1 text-sm text-gray-700">
          {edge.data?.exchangeType ?? "Non renseigné"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Protocole
        </p>

        <p className="mt-1 font-mono text-sm text-gray-700">
          {edge.data?.protocol ?? "Non renseigné"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Appel
        </p>

        <p className="mt-1 break-all font-mono text-sm text-gray-700">
          {edge.data?.method ? `${edge.data.method} ` : ""}
          {edge.data?.endpoint ?? "Non renseigné"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Requête
        </p>

        <p className="mt-1 text-sm text-gray-700">
          {edge.data?.requestLabel ?? "Non renseignée"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Réponse
        </p>

        <p className="mt-1 text-sm text-gray-700">
          {edge.data?.responseLabel ?? "Non renseignée"}
        </p>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Dernière exécution
        </p>

        <p className="mt-1 text-sm text-gray-700">
          {formatRuntimeDate(edge.data?.lastExecutionDate)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Durée
        </p>

        <p className="mt-1 font-mono text-sm text-gray-700">
          {formatDuration(edge.data?.durationMs)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Correlation ID
        </p>

        <p className="mt-1 break-all font-mono text-sm text-gray-700">
          {edge.data?.correlationId ?? "Non renseigné"}
        </p>
      </div>

      {edge.data?.errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Message d’erreur
          </p>

          <p className="mt-2 break-words text-sm leading-5 text-red-800">
            {edge.data.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}

function NodeDetails({ node }: { node: FlowNode }) {
  return (
    <div className="space-y-5 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Nom
        </p>

        <p className="mt-1 font-semibold text-gray-900">
          {node.data.displayLabel}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Node ID
        </p>

        <p className="mt-1 break-all font-mono text-sm text-gray-700">
          {node.id}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Type
        </p>

        <p className="mt-1 font-mono text-sm text-gray-700">
          {node.data.systemType ?? "system"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Description
        </p>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          {node.data.description || "Aucune description."}
        </p>
      </div>

      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
        <div className="flex gap-3">
          <Box
            size={18}
            className="mt-0.5 shrink-0 text-violet-700"
          />

          <p className="text-sm leading-5 text-violet-800">
            Ce nœud pourra ensuite afficher son statut d’exécution,
            sa durée et ses payloads.
          </p>
        </div>
      </div>
    </div>
  );
}

function TechnicalDetailsPanel({
  selectedEdge,
  selectedNode
}: {
  selectedEdge: FlowEdge | null;
  selectedNode: FlowNode | null;
}) {
  return (
    <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="font-semibold text-gray-900">
          Détails techniques
        </h3>

        <p className="mt-1 text-xs text-gray-500">
          Clique sur un composant ou une flèche.
        </p>
      </div>

      {selectedEdge ? (
        <EdgeDetails edge={selectedEdge} />
      ) : selectedNode ? (
        <NodeDetails node={selectedNode} />
      ) : (
        <div className="p-8 text-center text-sm text-gray-500">
          Aucun élément sélectionné.
        </div>
      )}
    </aside>
  );
}

function useIntegrationFlowVisualizer() {
  const [state, setState] = useReducer(
    mergeState<IntegrationFlowState>,
    INITIAL_INTEGRATION_FLOW_STATE
  );

  const {
    duration,
    error,
    flows,
    layoutSaveError,
    layoutSaveMessage,
    layoutSaving,
    loading,
    selectedEdge,
    selectedFlowId,
    selectedNode,
    validation
  } = state;

  const [nodes, setNodes, onNodesChange] =
    useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<FlowEdge>([]);

  const selectedFlow = useMemo(
    () =>
      flows.find((flow) => flow.id === selectedFlowId) ?? null,
    [flows, selectedFlowId]
  );

  const runtimeSummary = useMemo(() => {
    const summary: RuntimeSummary = {
      total: edges.length,
      success: 0,
      error: 0,
      running: 0,
      unknown: 0
    };

    for (const edge of edges) {
      const status = edge.data?.status ?? "unknown";
      summary[status] += 1;
    }

    return summary;
  }, [edges]);

  const resetDiagram = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setState({
      selectedNode: null,
      selectedEdge: null,
      validation: EMPTY_VALIDATION
    });
  }, [setEdges, setNodes]);

  const loadDiagram = useCallback(
    (flow: FlowDefinition) => {
      const parseResult = parseDiagram(flow.diagramJson);
      const diagram = parseResult.diagram;
      const validationResult = validateDiagram(diagram);

      if (parseResult.parseError) {
        validationResult.errors.unshift(parseResult.parseError);
      }

      setState({
        validation: validationResult
      });

      const statusPriority: Record<RuntimeStatus, number> = {
        unknown: 0,
        success: 1,
        running: 2,
        error: 3
      };

      const nodeStatusById =
        new Map<string, RuntimeStatus>();

      for (const diagramEdge of diagram.edges) {
        const edgeStatus =
          diagramEdge.data?.status ?? "unknown";

        for (const nodeId of [
          diagramEdge.source,
          diagramEdge.target
        ]) {
          const currentStatus =
            nodeStatusById.get(nodeId) ?? "unknown";

          if (
            statusPriority[edgeStatus] >
            statusPriority[currentStatus]
          ) {
            nodeStatusById.set(nodeId, edgeStatus);
          }
        }
      }

      const nextNodes = diagram.nodes.map<FlowNode>(
        (diagramNode) => {
          const systemType = diagramNode.data?.systemType;
          const appearance = getNodeAppearance(systemType);
          const Icon = getSystemIcon(systemType);
          const displayLabel =
            typeof diagramNode.data?.label === "string" &&
            diagramNode.data.label.trim()
              ? diagramNode.data.label
              : diagramNode.id;

          return {
            id: diagramNode.id,
            type: "futuristic",
            position: diagramNode.position,
            data: {
              ...diagramNode.data,
              displayLabel,
              status:
                nodeStatusById.get(diagramNode.id) ??
                "unknown",
              label: (
                <div className="flex min-w-40 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: appearance.background,
                      color: appearance.color
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      {displayLabel}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {systemType ?? "system"}
                    </p>
                  </div>
                </div>
              )
            },
            style: {
              width: 250,
              background: "transparent",
              border: "none",
              padding: 0
            }
          };
        }
      );


      const nextEdges = diagram.edges.map<FlowEdge>(
        (diagramEdge) => {
          const edgeType: DiagramEdgeType =
            diagramEdge.type === "bidirectional"
              ? "bidirectional"
              : "animated";

          const status =
            diagramEdge.data?.status ?? "unknown";

          const edgeColor =
            getRuntimeEdgeColor(status);

          const marker = {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: edgeColor
          };

          return {
            id: diagramEdge.id,
            source: diagramEdge.source,
            target: diagramEdge.target,
            type: edgeType,
            label: diagramEdge.label,
            animated: false,
            markerEnd: marker,
            markerStart:
              edgeType === "bidirectional"
                ? marker
                : undefined,
            data: {
              ...diagramEdge.data,
              status,
              lastExecutionDate:
                diagramEdge.data?.lastExecutionDate,
              durationMs:
                diagramEdge.data?.durationMs,
              correlationId:
                diagramEdge.data?.correlationId,
              errorMessage:
                diagramEdge.data?.errorMessage
            },
            style: {
              strokeWidth: 0
            }
          };
        }
      );

      setNodes(nextNodes);
      setEdges(nextEdges);
      setState({
        selectedNode: null,
        selectedEdge: null
      });
    },
    [setEdges, setNodes]
  );


  const loadFlows = useCallback(async () => {
    setState({
      loading: true,
      error: "",
      duration: null
    });

    const startTime = performance.now();

    try {
      const dataSdk = await createDataSDK();

      if (!dataSdk.fetch) {
        throw new Error(
          "Le service Fetch du Salesforce Platform SDK n’est pas disponible."
        );
      }

      const response = await dataSdk.fetch(FLOWS_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      const rawResponse = await response.text();

      const nextDuration = Math.round(
        performance.now() - startTime
      );

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(rawResponse, response.status)
        );
      }

      const data = JSON.parse(rawResponse) as FlowListResponse;
      const loadedFlows = data.flows ?? [];

      if (loadedFlows.length > 0) {
        const firstFlow = loadedFlows[0];

        setState({
          flows: loadedFlows,
          selectedFlowId: firstFlow.id,
          duration: nextDuration
        });
        loadDiagram(firstFlow);
      } else {
        setState({
          flows: [],
          selectedFlowId: "",
          duration: nextDuration
        });
        resetDiagram();
      }
    } catch (currentError) {
      resetDiagram();

      setState({
        flows: [],
        selectedFlowId: "",
        error:
          currentError instanceof Error
            ? currentError.message
            : "Impossible de charger les intégrations."
      });
    } finally {
      setState({ loading: false });
    }
  }, [loadDiagram, resetDiagram]);

  const saveNodePosition = useCallback(
    async (node: FlowNode) => {
      if (!selectedFlowId) {
        return;
      }

      setState({
        layoutSaving: true,
        layoutSaveMessage: "",
        layoutSaveError: ""
      });

      try {
        const dataSdk = await createDataSDK();

        if (!dataSdk.fetch) {
          throw new Error(
            "Le service Fetch du Salesforce Platform SDK n’est pas disponible."
          );
        }

        const response = await dataSdk.fetch(
          FLOWS_ENDPOINT,
          {
            method: "PATCH",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              flowId: selectedFlowId,
              nodes: [
                {
                  id: node.id,
                  x: node.position.x,
                  y: node.position.y
                }
              ]
            })
          }
        );

        const rawResponse = await response.text();

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              rawResponse,
              response.status
            )
          );
        }

        const result =
          JSON.parse(rawResponse) as LayoutUpdateResponse;

        setState((currentState) => ({
          flows: currentState.flows.map((flow) =>
            flow.id === selectedFlowId
              ? {
                  ...flow,
                  diagramJson:
                    updateDiagramNodePosition(
                      flow.diagramJson,
                      node.id,
                      node.position
                    ),
                  lastModifiedDate:
                    result.savedAt ??
                    flow.lastModifiedDate
                }
              : flow
          ),
          layoutSaveMessage:
            result.updatedNodes === 1
              ? "Position enregistrée"
              : `${result.updatedNodes} positions enregistrées`
        }));
      } catch (currentError) {
        setState({
          layoutSaveError:
            currentError instanceof Error
              ? currentError.message
              : "Impossible d’enregistrer la position."
        });
      } finally {
        setState({ layoutSaving: false });
      }
    },
    [selectedFlowId]
  );

  function changeFlow(flowId: string) {
    setState({ selectedFlowId: flowId });

    const flow = flows.find(
      (currentFlow) => currentFlow.id === flowId
    );

    if (flow) {
      loadDiagram(flow);
    }
  }

  const handleNodeClick: NodeMouseHandler<FlowNode> = (
    _event,
    node
  ) => {
    setState({
      selectedNode: node,
      selectedEdge: null
    });
  };

  const handleEdgeClick: EdgeMouseHandler<FlowEdge> = (
    _event,
    edge
  ) => {
    setState({
      selectedEdge: edge,
      selectedNode: null
    });
  };

  const handleNodeDragStop: OnNodeDrag<FlowNode> = (
    _event,
    node
  ) => {
    void saveNodePosition(node);
  };

  function clearSelection() {
    setState({
      selectedNode: null,
      selectedEdge: null
    });
  }

  useEffect(() => {
    void loadFlows();
  }, [loadFlows]);

  return {
    changeFlow,
    clearSelection,
    duration,
    edges,
    error,
    flows,
    handleEdgeClick,
    handleNodeClick,
    handleNodeDragStop,
    layoutSaveError,
    layoutSaveMessage,
    layoutSaving,
    loadFlows,
    loading,
    nodes,
    onEdgesChange,
    onNodesChange,
    runtimeSummary,
    selectedEdge,
    selectedFlow,
    selectedFlowId,
    selectedNode,
    validation
  };
}

export default function IntegrationFlowVisualizer() {
  const {
    changeFlow,
    clearSelection,
    duration,
    edges,
    error,
    flows,
    handleEdgeClick,
    handleNodeClick,
    handleNodeDragStop,
    layoutSaveError,
    layoutSaveMessage,
    layoutSaving,
    loadFlows,
    loading,
    nodes,
    onEdgesChange,
    onNodesChange,
    runtimeSummary,
    selectedEdge,
    selectedFlow,
    selectedFlowId,
    selectedNode,
    validation
  } = useIntegrationFlowVisualizer();

  return (
    <div className="space-y-6">
      <IntegrationHeader />

      <FlowSelectorCard
        duration={duration}
        flows={flows}
        layoutSaveError={layoutSaveError}
        layoutSaveMessage={layoutSaveMessage}
        layoutSaving={layoutSaving}
        loading={loading}
        selectedFlow={selectedFlow}
        selectedFlowId={selectedFlowId}
        onFlowChange={changeFlow}
        onRefresh={() => void loadFlows()}
      />

      {error && <ErrorBanner message={error} />}

      {selectedFlow && (
        <SelectedFlowSummary flow={selectedFlow} />
      )}

      {selectedFlow && runtimeSummary.total > 0 && (
        <RuntimeSummaryPanel runtimeSummary={runtimeSummary} />
      )}

      {selectedFlow && (
        <ValidationPanel validation={validation} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <FlowCanvasPanel
          edges={edges}
          nodes={nodes}
          runtimeSummary={runtimeSummary}
          selectedFlow={selectedFlow}
          onEdgeClick={handleEdgeClick}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStop={handleNodeDragStop}
          onNodesChange={onNodesChange}
          onPaneClick={clearSelection}
        />

        <TechnicalDetailsPanel
          selectedEdge={selectedEdge}
          selectedNode={selectedNode}
        />
      </div>
    </div>
  );
}
