import { useState } from "react";
import { createDataSDK } from "@salesforce/platform-sdk";

type ApiResponse = {
  statusCode: number;
  status: string;
  body: string;
  contentType: string | null;
};

export default function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState(
    "/countries/v5/names.common/France"
  );
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState(
    '{\n  "status": "Waiting for request"\n}'
  );
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const methodAllowsBody = ["POST", "PUT", "PATCH"].includes(method);

  async function sendRequest() {
  setLoading(true);
  setError("");
  setStatus(null);

  try {
    const dataSdk = await createDataSDK();

    if (!dataSdk.fetch) {
      throw new Error(
        "Le service Fetch du Salesforce Platform SDK n’est pas disponible."
      );
    }

    const result = await dataSdk.fetch(
      "/services/apexrest/integration-studio/api",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          method,
          endpoint,
          requestBody: methodAllowsBody ? requestBody : null
        })
      }
    );

    const rawResponse = await result.text();

    if (!result.ok) {
      throw new Error(
        rawResponse || `Erreur Salesforce HTTP ${result.status}`
      );
    }

    const data = JSON.parse(rawResponse) as ApiResponse;

    setStatus(data.statusCode);

    try {
      const parsedBody = JSON.parse(data.body);
      setResponse(JSON.stringify(parsedBody, null, 2));
    } catch {
      setResponse(data.body);
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
            onChange={(event) => setMethod(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-900 outline-none focus:border-blue-500"
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
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none focus:border-blue-500"
            placeholder="/countries/v5/names.common/France"
          />

          <button
            type="button"
            onClick={sendRequest}
            disabled={loading || !endpoint.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Request
            </h3>

            <span className="text-xs text-gray-500">
              {methodAllowsBody
                ? "JSON body"
                : "No body for this method"}
            </span>
          </div>

          <textarea
            value={requestBody}
            onChange={(event) => setRequestBody(event.target.value)}
            disabled={!methodAllowsBody}
            className="mt-4 min-h-72 w-full resize-none rounded-lg border border-gray-300 p-4 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            placeholder={
              methodAllowsBody
                ? '{\n  "key": "value"\n}'
                : "Sélectionne POST, PUT ou PATCH pour ajouter un body."
            }
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Response
            </h3>

            {status !== null && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  status >= 200 && status < 300
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                HTTP {status}
              </span>
            )}
          </div>

          {error ? (
            <div className="mt-4 min-h-72 whitespace-pre-wrap rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <pre className="mt-4 min-h-72 overflow-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-100">
              {response}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}