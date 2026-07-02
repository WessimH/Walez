import { useMemo, useReducer } from "react";
import {
  Braces,
  Check,
  Clipboard,
  FileJson,
  Minimize2,
  Trash2,
  WandSparkles
} from "lucide-react";
import { mergeState } from "../utils/state";

const DEFAULT_JSON = `{
  "project": "Salesforce Integration Studio",
  "module": "JSON Formatter",
  "active": true,
  "tools": [
    "format",
    "minify",
    "validate",
    "copy"
  ]
}`;

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

function extractJsonErrorPosition(message: string): number | null {
  const match = message.match(/position\s+(\d+)/i);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function getLineAndColumn(
  value: string,
  position: number
): {
  line: number;
  column: number;
} {
  const beforeError = value.slice(0, position);
  const lines = beforeError.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

type JsonFormatterState = {
  copied: boolean;
  error: string;
  input: string;
  output: string;
  successMessage: string;
};

const initialJsonFormatterState: JsonFormatterState = {
  copied: false,
  error: "",
  input: DEFAULT_JSON,
  output: "",
  successMessage: ""
};

function useJsonFormatter() {
  const [state, setState] = useReducer(
    mergeState<JsonFormatterState>,
    initialJsonFormatterState
  );

  const { copied, error, input, output, successMessage } = state;

  const inputStats = useMemo(() => {
    const bytes = new TextEncoder().encode(input).length;
    const lines = input ? input.split("\n").length : 0;

    return {
      bytes,
      lines
    };
  }, [input]);

  const outputStats = useMemo(() => {
    const bytes = new TextEncoder().encode(output).length;
    const lines = output ? output.split("\n").length : 0;

    return {
      bytes,
      lines
    };
  }, [output]);

  function resetMessages() {
    setState({ error: "", successMessage: "" });
  }

  function parseInput(): unknown {
    if (!input.trim()) {
      throw new Error("Le contenu JSON est vide.");
    }

    return JSON.parse(input);
  }

  function handleJsonError(currentError: unknown) {
    if (!(currentError instanceof Error)) {
      setState({
        output: "",
        successMessage: "",
        error: "Le JSON est invalide."
      });
      return;
    }

    const position = extractJsonErrorPosition(currentError.message);

    if (position === null) {
      setState({
        output: "",
        successMessage: "",
        error: `JSON invalide : ${currentError.message}`
      });
      return;
    }

    const location = getLineAndColumn(input, position);

    setState({
      output: "",
      successMessage: "",
      error: `JSON invalide à la ligne ${location.line}, colonne ${location.column}.\n${currentError.message}`
    });
  }

  function formatJson() {
    resetMessages();

    try {
      const parsedJson = parseInput();
      const formattedJson = JSON.stringify(parsedJson, null, 2);

      setState({
        output: formattedJson,
        successMessage: "JSON formaté avec succès."
      });
    } catch (currentError) {
      handleJsonError(currentError);
    }
  }

  function minifyJson() {
    resetMessages();

    try {
      const parsedJson = parseInput();
      const minifiedJson = JSON.stringify(parsedJson);

      setState({
        output: minifiedJson,
        successMessage: "JSON minifié avec succès."
      });
    } catch (currentError) {
      handleJsonError(currentError);
    }
  }

  function validateJson() {
    resetMessages();

    try {
      parseInput();

      setState({
        output: "",
        successMessage: "Le JSON est valide."
      });
    } catch (currentError) {
      handleJsonError(currentError);
    }
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);

      setState({ copied: true });

      window.setTimeout(() => {
        setState({ copied: false });
      }, 1600);
    } catch {
      setState({
        error: "Impossible de copier le résultat."
      });
    }
  }

  function clearAll() {
    setState({
      input: "",
      output: "",
      error: "",
      successMessage: "",
      copied: false
    });
  }

  function loadExample() {
    setState({
      input: DEFAULT_JSON,
      output: "",
      error: "",
      successMessage: ""
    });
  }

  function changeInput(value: string) {
    setState({
      input: value,
      error: "",
      successMessage: ""
    });
  }

  return {
    changeInput,
    clearAll,
    copied,
    copyOutput,
    error,
    formatJson,
    input,
    inputStats,
    loadExample,
    minifyJson,
    output,
    outputStats,
    successMessage,
    validateJson
  };
}

export default function JsonFormatter() {
  const {
    changeInput,
    clearAll,
    copied,
    copyOutput,
    error,
    formatJson,
    input,
    inputStats,
    loadExample,
    minifyJson,
    output,
    outputStats,
    successMessage,
    validateJson
  } = useJsonFormatter();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <FileJson size={24} />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              JSON Formatter
            </h2>

            <p className="mt-1 text-gray-500">
              Formate, minifie et valide rapidement du JSON.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={formatJson}
          disabled={!input.trim()}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WandSparkles size={17} />
          Format
        </button>

        <button
          type="button"
          onClick={minifyJson}
          disabled={!input.trim()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Minimize2 size={17} />
          Minify
        </button>

        <button
          type="button"
          onClick={validateJson}
          disabled={!input.trim()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Braces size={17} />
          Validate
        </button>

        <button
          type="button"
          onClick={loadExample}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
        >
          <FileJson size={17} />
          Load example
        </button>

        <button
          type="button"
          onClick={clearAll}
          className="ml-auto flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 font-medium text-red-700 transition hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 size={17} />
          Clear
        </button>
      </div>

      {error && (
        <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          <Check size={17} />
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold text-gray-900">
              Input JSON
            </h3>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{inputStats.lines} lines</span>
              <span>•</span>
              <span>{formatBytes(inputStats.bytes)}</span>
            </div>
          </div>

          <div className="p-5">
            <textarea
              value={input}
              onChange={(event) =>
                changeInput(event.target.value)
              }
              className="min-h-[520px] w-full resize-y rounded-lg border border-gray-300 p-4 font-mono text-sm leading-6 text-gray-900 outline-none focus:border-purple-500"
              placeholder={'{\n  "key": "value"\n}'}
              spellCheck={false}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                Output
              </h3>

              {output && (
                <p className="mt-1 text-xs text-gray-500">
                  {outputStats.lines} lines •{" "}
                  {formatBytes(outputStats.bytes)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void copyOutput()}
              disabled={!output}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? (
                <Check size={14} />
              ) : (
                <Clipboard size={14} />
              )}

              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="p-5">
            <pre className="min-h-[520px] max-h-[700px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-4 font-mono text-sm leading-6 text-gray-100">
              {output || '{\n  "status": "Waiting for JSON"\n}'}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
