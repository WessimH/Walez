import { useMemo, useState } from "react";
import { createDataSDK } from "@salesforce/platform-sdk";
import {
  Braces,
  Check,
  Clipboard,
  Code2,
  Plus,
  Send,
  Trash2,
  X
} from "lucide-react";

type ApiResponse = {
  statusCode: number;
  status: string;
  body: string;
  contentType: string | null;
};

type RequestHeader = {
  id: number;
  key: string;
  value: string;
  enabled: boolean;
};

type RequestTab = "headers" | "body";

const SALESFORCE_ENDPOINT =
  "/services/apexrest/integration-studio/api";

const API_BASE_URL = "https://api.restcountries.com";

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function formatJson(value: string): string {
  return JSON.stringify(JSON.parse(value), null, 2);
}

export default function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState(
    "/countries/v5/names.common/France"
  );

  const [requestBody, setRequestBody] = useState("");
  const [requestHeaders, setRequestHeaders] = useState<RequestHeader[]>([
    {
      id: 1,
      key: "Accept",
      value: "application/json",
      enabled: true
    }
  ]);

  const [activeTab, setActiveTab] =
    useState<RequestTab>("headers");

  const [response, setResponse] = useState(
    '{\n  "status": "Waiting for request"\n}'
  );

  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("");
  const [contentType, setContentType] = useState<string | null>(null);
  const [responseSize, setResponseSize] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedAction, setCopiedAction] = useState("");

  const methodAllowsBody = ["POST", "PUT", "PATCH"].includes(method);

  const enabledHeaders = useMemo(() => {
    return requestHeaders.reduce<Record<string, string>>(
      (result, header) => {
        const key = header.key.trim();

        if (header.enabled && key) {
          result[key] = header.value;
        }

        return result;
      },
      {}
    );
  }, [requestHeaders]);

  function showCopied(action: string) {
    setCopiedAction(action);

    window.setTimeout(() => {
      setCopiedAction("");
    }, 1600);
  }

  function addHeader() {
    setRequestHeaders((currentHeaders) => [
      ...currentHeaders,
      {
        id: Date.now(),
        key: "",
        value: "",
        enabled: true
      }
    ]);
  }

  function updateHeader(
    id: number,
    field: keyof Omit<RequestHeader, "id">,
    value: string | boolean
  ) {
    setRequestHeaders((currentHeaders) =>
      currentHeaders.map((header) =>
        header.id === id
          ? {
              ...header,
              [field]: value
            }
          : header
      )
    );
  }

  function removeHeader(id: number) {
    setRequestHeaders((currentHeaders) =>
      currentHeaders.filter((header) => header.id !== id)
    );
  }

  function validateRequestBody(): boolean {
    if (!methodAllowsBody || !requestBody.trim()) {
      return true;
    }

    try {
      JSON.parse(requestBody);
      return true;
    } catch {
      setError("Le body contient un JSON invalide.");
      return false;
    }
  }

  function formatRequestBody() {
    if (!requestBody.trim()) {
      return;
    }

    try {
      setRequestBody(formatJson(requestBody));
      setError("");
    } catch {
      setError("Impossible de formater le body : JSON invalide.");
    }
  }

  function clearResponse() {
    setResponse('{\n  "status": "Waiting for request"\n}');
    setStatus(null);
    setStatusText("");
    setContentType(null);
    setResponseSize(null);
    setDuration(null);
    setError("");
  }

  async function copyText(value: string, action: string) {
    try {
      await navigator.clipboard.writeText(value);
      showCopied(action);
    } catch {
      setError("Impossible de copier le contenu.");
    }
  }

  function generateCurl(): string {
    const lines = [
      `curl --request ${method} \\`,
      `  --url '${API_BASE_URL}${endpoint}'`
    ];

    Object.entries(enabledHeaders).forEach(([key, value]) => {
      lines[lines.length - 1] += " \\";
      lines.push(`  --header '${key}: ${value}'`);
    });

    if (methodAllowsBody && requestBody.trim()) {
      lines[lines.length - 1] += " \\";
      lines.push(
        `  --data '${requestBody.replace(/'/g, "'\\''")}'`
      );
    }

    return lines.join("\n");
  }

  async function sendRequest() {
    setDuration(null);
    setLoading(true);
    setError("");
    setStatus(null);
    setStatusText("");
    setContentType(null);
    setResponseSize(null);

    if (!validateRequestBody()) {
      setLoading(false);
      return;
    }

    try {
      const dataSdk = await createDataSDK();

      if (!dataSdk.fetch) {
        throw new Error(
          "Le service Fetch du Salesforce Platform SDK n’est pas disponible."
        );
      }

      const startTime = performance.now();

      const result = await dataSdk.fetch(SALESFORCE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          method,
          endpoint,
          requestBody:
            methodAllowsBody && requestBody.trim()
              ? requestBody
              : null,
          requestHeaders: enabledHeaders
        })
      });

      const rawResponse = await result.text();

      setDuration(Math.round(performance.now() - startTime));

      if (!result.ok) {
        throw new Error(
          rawResponse || `Erreur Salesforce HTTP ${result.status}`
        );
      }

      const data = JSON.parse(rawResponse) as ApiResponse;
      const responseBody = data.body ?? "";

      setStatus(data.statusCode);
      setStatusText(data.status ?? "");
      setContentType(data.contentType);
      setResponseSize(new TextEncoder().encode(responseBody).length);

      try {
        setResponse(formatJson(responseBody));
      } catch {
        setResponse(responseBody);
      }
    } catch (requestError) {
      setResponse("");

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  const isSuccessfulStatus =
    status !== null && status >= 200 && status < 300;

  const responseBadgeClasses = isSuccessfulStatus
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          API Tester
        </h2>

        <p className="mt-2 text-gray-500">
          Teste une API REST via Apex et une Named Credential Salesforce.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <select
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);

              if (
                !["POST", "PUT", "PATCH"].includes(event.target.value)
              ) {
                setActiveTab("headers");
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900 outline-none focus:border-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !loading) {
                void sendRequest();
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500"
            placeholder="/countries/v5/names.common/France"
          />

          <button
            type="button"
            onClick={() => void sendRequest()}
            disabled={loading || !endpoint.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} />
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Named Credential :{" "}
          <span className="font-mono font-medium text-gray-700">
            REST_Countries
          </span>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Request
              </h3>

              <button
                type="button"
                onClick={() =>
                  void copyText(generateCurl(), "curl")
                }
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
              >
                {copiedAction === "curl" ? (
                  <Check size={14} />
                ) : (
                  <Code2 size={14} />
                )}

                {copiedAction === "curl"
                  ? "Copied"
                  : "Copy cURL"}
              </button>
            </div>

            <div className="mt-4 flex gap-5">
              <button
                type="button"
                onClick={() => setActiveTab("headers")}
                className={`border-b-2 pb-3 text-sm font-medium transition ${
                  activeTab === "headers"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Headers
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {
                    requestHeaders.filter(
                      (header) =>
                        header.enabled && header.key.trim()
                    ).length
                  }
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (methodAllowsBody) {
                    setActiveTab("body");
                  }
                }}
                disabled={!methodAllowsBody}
                className={`border-b-2 pb-3 text-sm font-medium transition ${
                  activeTab === "body"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Body
              </button>
            </div>
          </div>

          <div className="p-5">
            {activeTab === "headers" ? (
              <div className="space-y-3">
                {requestHeaders.map((header) => (
                  <div
                    key={header.id}
                    className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(event) =>
                        updateHeader(
                          header.id,
                          "enabled",
                          event.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />

                    <input
                      type="text"
                      value={header.key}
                      onChange={(event) =>
                        updateHeader(
                          header.id,
                          "key",
                          event.target.value
                        )
                      }
                      placeholder="Header"
                      className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
                    />

                    <input
                      type="text"
                      value={header.value}
                      onChange={(event) =>
                        updateHeader(
                          header.id,
                          "value",
                          event.target.value
                        )
                      }
                      placeholder="Value"
                      className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => removeHeader(header.id)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Supprimer le header"
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addHeader}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Add header
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    JSON body
                  </span>

                  <button
                    type="button"
                    onClick={formatRequestBody}
                    disabled={!requestBody.trim()}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Braces size={14} />
                    Format JSON
                  </button>
                </div>

                <textarea
                  value={requestBody}
                  onChange={(event) =>
                    setRequestBody(event.target.value)
                  }
                  className="min-h-80 w-full resize-y rounded-lg border border-gray-300 p-4 font-mono text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder={'{\n  "key": "value"\n}'}
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-900">
              Response
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {status !== null && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${responseBadgeClasses}`}
                  title={statusText}
                >
                  HTTP {status}
                </span>
              )}

              {duration !== null && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {duration} ms
                </span>
              )}

              {responseSize !== null && (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                  {formatBytes(responseSize)}
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  void copyText(response, "response")
                }
                disabled={!response}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copiedAction === "response" ? (
                  <Check size={14} />
                ) : (
                  <Clipboard size={14} />
                )}

                {copiedAction === "response"
                  ? "Copied"
                  : "Copy"}
              </button>

              <button
                type="button"
                onClick={clearResponse}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>

          {contentType && (
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-2 font-mono text-xs text-gray-500">
              Content-Type: {contentType}
            </div>
          )}

          <div className="p-5">
            {error ? (
              <div className="min-h-80 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
                {error}
              </div>
            ) : (
              <pre className="min-h-80 max-h-[650px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-4 font-mono text-sm leading-6 text-gray-100">
                {response}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
