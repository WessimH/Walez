import { useMemo, useReducer } from "react";
import {
  Braces,
  Check,
  Clipboard,
  Code2,
  FileCode2,
  Trash2,
  WandSparkles
} from "lucide-react";
import { mergeState } from "../utils/state";

const DEFAULT_JSON = `{
  "name": "France",
  "population": 68000000,
  "active": true,
  "capital": {
    "name": "Paris",
    "population": 2100000
  },
  "languages": [
    {
      "code": "fr",
      "name": "French"
    }
  ],
  "currencies": [
    "EUR"
  ]
}`;

const APEX_RESERVED_WORDS = new Set([
  "abstract",
  "activate",
  "and",
  "any",
  "array",
  "as",
  "asc",
  "autonomous",
  "begin",
  "bigdecimal",
  "blob",
  "boolean",
  "break",
  "bulk",
  "by",
  "byte",
  "case",
  "cast",
  "catch",
  "char",
  "class",
  "collect",
  "commit",
  "const",
  "continue",
  "convertcurrency",
  "decimal",
  "default",
  "delete",
  "desc",
  "do",
  "else",
  "end",
  "enum",
  "exception",
  "exit",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "from",
  "future",
  "global",
  "goto",
  "group",
  "having",
  "if",
  "implements",
  "import",
  "in",
  "inner",
  "insert",
  "instanceof",
  "integer",
  "interface",
  "into",
  "join",
  "last_90_days",
  "like",
  "limit",
  "list",
  "long",
  "loop",
  "map",
  "merge",
  "new",
  "next_90_days",
  "not",
  "null",
  "nulls",
  "number",
  "object",
  "of",
  "on",
  "or",
  "override",
  "package",
  "parallel",
  "private",
  "protected",
  "public",
  "retrieve",
  "return",
  "rollback",
  "select",
  "set",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "testmethod",
  "then",
  "this",
  "throw",
  "time",
  "transaction",
  "trigger",
  "true",
  "try",
  "undelete",
  "update",
  "upsert",
  "using",
  "virtual",
  "void",
  "webservice",
  "when",
  "where",
  "while",
  "with",
  "without"
]);

type JsonObject = Record<string, unknown>;

type GeneratedClass = {
  name: string;
  fields: GeneratedField[];
};

type GeneratedField = {
  apexName: string;
  originalName: string;
  apexType: string;
  requiresMapping: boolean;
};

function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toPascalCase(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  const result = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join("");

  if (!result) {
    return "GeneratedType";
  }

  if (/^\d/.test(result)) {
    return `Type${result}`;
  }

  return result;
}

function toApexFieldName(value: string): {
  name: string;
  requiresMapping: boolean;
} {
  let result = value
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_");

  if (!result) {
    result = "fieldValue";
  }

  if (/^\d/.test(result)) {
    result = `field_${result}`;
  }

  const isReserved = APEX_RESERVED_WORDS.has(
    result.toLowerCase()
  );

  if (isReserved) {
    result = `${result}Value`;
  }

  return {
    name: result,
    requiresMapping: result !== value
  };
}

function inferPrimitiveType(value: unknown): string {
  if (value === null || value === undefined) {
    return "Object";
  }

  if (typeof value === "string") {
    return "String";
  }

  if (typeof value === "boolean") {
    return "Boolean";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      if (
        value > 2147483647 ||
        value < -2147483648
      ) {
        return "Long";
      }

      return "Integer";
    }

    return "Decimal";
  }

  return "Object";
}

function singularize(value: string): string {
  if (value.endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }

  if (
    value.endsWith("ses") ||
    value.endsWith("xes")
  ) {
    return value.slice(0, -2);
  }

  if (value.endsWith("s") && value.length > 1) {
    return value.slice(0, -1);
  }

  return value;
}

function buildClasses(
  rootObject: JsonObject,
  rootClassName: string
): GeneratedClass[] {
  const classes: GeneratedClass[] = [];
  const generatedClassNames = new Set<string>();

  function createClass(
    objectValue: JsonObject,
    className: string
  ): string {
    let normalizedClassName =
      toPascalCase(className);

    let suffix = 2;

    while (
      generatedClassNames.has(normalizedClassName)
    ) {
      normalizedClassName = `${toPascalCase(
        className
      )}${suffix}`;
      suffix += 1;
    }

    generatedClassNames.add(normalizedClassName);

    const generatedClass: GeneratedClass = {
      name: normalizedClassName,
      fields: []
    };

    classes.push(generatedClass);

    for (const [originalName, value] of Object.entries(
      objectValue
    )) {
      const fieldInfo =
        toApexFieldName(originalName);

      let apexType: string;

      if (isJsonObject(value)) {
        const nestedClassName =
          toPascalCase(originalName);

        apexType = createClass(
          value,
          nestedClassName
        );
      } else if (Array.isArray(value)) {
        apexType = inferArrayType(
          value,
          originalName
        );
      } else {
        apexType = inferPrimitiveType(value);
      }

      generatedClass.fields.push({
        apexName: fieldInfo.name,
        originalName,
        apexType,
        requiresMapping: fieldInfo.requiresMapping
      });
    }

    return normalizedClassName;
  }

  function inferArrayType(
    values: unknown[],
    fieldName: string
  ): string {
    if (values.length === 0) {
      return "List<Object>";
    }

    const firstNonNullValue = values.find(
      (value) => value !== null
    );

    if (firstNonNullValue === undefined) {
      return "List<Object>";
    }

    if (isJsonObject(firstNonNullValue)) {
      const itemClassName = toPascalCase(
        singularize(fieldName)
      );

      const nestedType = createClass(
        firstNonNullValue,
        itemClassName
      );

      return `List<${nestedType}>`;
    }

    if (Array.isArray(firstNonNullValue)) {
      return "List<List<Object>>";
    }

    return `List<${inferPrimitiveType(
      firstNonNullValue
    )}>`;
  }

  createClass(rootObject, rootClassName);

  return classes;
}

function generateApexCode(
  classes: GeneratedClass[],
  rootClassName: string,
  useProperties: boolean
): string {
  if (classes.length === 0) {
    return "";
  }

  const normalizedRootClassName =
    toPascalCase(rootClassName);

  const rootClass =
    classes.find(
      (generatedClass) =>
        generatedClass.name === normalizedRootClassName
    ) ?? classes[0];

  const nestedClasses = classes.filter(
    (generatedClass) =>
      generatedClass !== rootClass
  );

  const lines: string[] = [];

  lines.push(
    `public class ${rootClass.name} {`
  );

  for (const field of rootClass.fields) {
    if (field.requiresMapping) {
      lines.push(
        `    // JSON field: ${field.originalName}`
      );
    }

    lines.push(
      useProperties
        ? `    public ${field.apexType} ${field.apexName} { get; set; }`
        : `    public ${field.apexType} ${field.apexName};`
    );
  }

  if (
    rootClass.fields.length > 0 &&
    nestedClasses.length > 0
  ) {
    lines.push("");
  }

  nestedClasses.forEach(
    (generatedClass, classIndex) => {
      lines.push(
        `    public class ${generatedClass.name} {`
      );

      for (const field of generatedClass.fields) {
        if (field.requiresMapping) {
          lines.push(
            `        // JSON field: ${field.originalName}`
          );
        }

        lines.push(
          useProperties
            ? `        public ${field.apexType} ${field.apexName} { get; set; }`
            : `        public ${field.apexType} ${field.apexName};`
        );
      }

      lines.push("    }");

      if (classIndex < nestedClasses.length - 1) {
        lines.push("");
      }
    }
  );

  lines.push("}");

  return lines.join("\n");
}

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

  return `${value.toFixed(
    unitIndex === 0 ? 0 : 2
  )} ${units[unitIndex]}`;
}

type ApexDtoState = {
  className: string;
  input: string;
  output: string;
  error: string;
  copied: boolean;
  useProperties: boolean;
};

const initialApexDtoState: ApexDtoState = {
  className: "CountryDTO",
  input: DEFAULT_JSON,
  output: "",
  error: "",
  copied: false,
  useProperties: false
};

type GeneratorControlsProps = {
  classNameValue: string;
  input: string;
  useProperties: boolean;
  onClassNameChange: (value: string) => void;
  onUsePropertiesChange: (value: boolean) => void;
  onGenerate: () => void;
  onLoadExample: () => void;
  onClear: () => void;
};

function ApexDtoHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
        <FileCode2 size={24} />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Apex DTO Generator
        </h2>

        <p className="mt-1 text-gray-500">
          Génère automatiquement des classes Apex à partir
          d’un JSON.
        </p>
      </div>
    </div>
  );
}

function GeneratorControls({
  classNameValue,
  input,
  useProperties,
  onClassNameChange,
  onUsePropertiesChange,
  onGenerate,
  onLoadExample,
  onClear
}: GeneratorControlsProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label
            htmlFor="className"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Nom de la classe Apex
          </label>

          <input
            id="className"
            type="text"
            value={classNameValue}
            onChange={(event) =>
              onClassNameChange(event.target.value)
            }
            placeholder="CountryDTO"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm outline-none focus:border-orange-500"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={useProperties}
            onChange={(event) =>
              onUsePropertiesChange(event.target.checked)
            }
            className="h-4 w-4 rounded border-gray-300"
          />

          Générer avec get / set
        </label>

        <button
          type="button"
          onClick={onGenerate}
          disabled={
            !input.trim() || !classNameValue.trim()
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2 font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WandSparkles size={17} />
          Generate DTO
        </button>

        <button
          type="button"
          onClick={onLoadExample}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
        >
          <Braces size={17} />
          Example
        </button>

        <button
          type="button"
          onClick={onClear}
          className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 font-medium text-red-700 transition hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 size={17} />
          Clear
        </button>
      </div>
    </section>
  );
}

function ErrorBanner({ error }: { error: string }) {
  if (!error) {
    return null;
  }

  return (
    <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
      {error}
    </div>
  );
}

type CodeWorkspaceProps = {
  classNameValue: string;
  copied: boolean;
  input: string;
  inputSize: number;
  output: string;
  outputLines: number;
  outputSize: number;
  onCopyOutput: () => void;
  onInputChange: (value: string) => void;
};

function CodeWorkspace({
  classNameValue,
  copied,
  input,
  inputSize,
  output,
  outputLines,
  outputSize,
  onCopyOutput,
  onInputChange
}: CodeWorkspaceProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold text-gray-900">
            JSON Input
          </h3>

          <span className="text-xs text-gray-500">
            {formatBytes(inputSize)}
          </span>
        </div>

        <div className="p-5">
          <textarea
            value={input}
            onChange={(event) =>
              onInputChange(event.target.value)
            }
            className="min-h-[560px] w-full resize-y rounded-lg border border-gray-300 p-4 font-mono text-sm leading-6 text-gray-900 outline-none focus:border-orange-500"
            placeholder={'{\n  "name": "France"\n}'}
            spellCheck={false}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              Apex Output
            </h3>

            {output && (
              <p className="mt-1 text-xs text-gray-500">
                {outputLines} lines •{" "}
                {formatBytes(outputSize)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onCopyOutput}
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
          <pre className="min-h-[560px] max-h-[760px] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-4 font-mono text-sm leading-6 text-gray-100">
            {output ||
              `public class ${toPascalCase(
                classNameValue || "GeneratedDTO"
              )} {\n    // Generated Apex code\n}`}
          </pre>
        </div>
      </section>
    </div>
  );
}

function UsageSnippet({
  classNameValue
}: {
  classNameValue: string;
}) {
  const normalizedClassName = toPascalCase(
    classNameValue || "GeneratedDTO"
  );

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex gap-3">
        <Code2
          size={20}
          className="mt-0.5 shrink-0 text-blue-700"
        />

        <div>
          <h3 className="font-semibold text-blue-900">
            Utilisation dans Apex
          </h3>

          <pre className="mt-3 overflow-auto rounded-lg bg-blue-950 p-4 font-mono text-sm text-blue-50">
{`${normalizedClassName} dto = (${normalizedClassName}) JSON.deserialize(
    jsonResponse,
    ${normalizedClassName}.class
);`}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default function ApexDtoGenerator() {
  const [state, setState] = useReducer(
    mergeState<ApexDtoState>,
    initialApexDtoState
  );

  const {
    className,
    copied,
    error,
    input,
    output,
    useProperties
  } = state;

  const inputSize = useMemo(
    () => new TextEncoder().encode(input).length,
    [input]
  );

  const outputSize = useMemo(
    () => new TextEncoder().encode(output).length,
    [output]
  );

  const outputLines = useMemo(
    () => (output ? output.split("\n").length : 0),
    [output]
  );

  function generateDto() {
    setState({ error: "", copied: false });

    if (!className.trim()) {
      setState({
        output: "",
        error: "Le nom de la classe Apex est obligatoire."
      });
      return;
    }

    if (!input.trim()) {
      setState({
        output: "",
        error: "Le contenu JSON est vide."
      });
      return;
    }

    try {
      const parsedJson: unknown =
        JSON.parse(input);

      if (!isJsonObject(parsedJson)) {
        throw new Error(
          "Le JSON racine doit être un objet."
        );
      }

      const normalizedClassName =
        toPascalCase(className);

      const classes = buildClasses(
        parsedJson,
        normalizedClassName
      );

      const apexCode = generateApexCode(
        classes,
        normalizedClassName,
        useProperties
      );

      setState({
        className: normalizedClassName,
        output: apexCode
      });
    } catch (currentError) {
      setState({
        output: "",
        error:
          currentError instanceof Error
            ? currentError.message
            : "Impossible de générer le DTO Apex."
      });
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
        error: "Impossible de copier le code Apex."
      });
    }
  }

  function clearAll() {
    setState({
      input: "",
      output: "",
      error: "",
      copied: false
    });
  }

  function loadExample() {
    setState({
      className: "CountryDTO",
      input: DEFAULT_JSON,
      output: "",
      error: "",
      copied: false
    });
  }

  return (
    <div className="space-y-6">
      <ApexDtoHeader />

      <GeneratorControls
        classNameValue={className}
        input={input}
        useProperties={useProperties}
        onClassNameChange={(value) =>
          setState({ className: value })
        }
        onUsePropertiesChange={(value) =>
          setState({ useProperties: value })
        }
        onGenerate={generateDto}
        onLoadExample={loadExample}
        onClear={clearAll}
      />

      <ErrorBanner error={error} />

      <CodeWorkspace
        classNameValue={className}
        copied={copied}
        input={input}
        inputSize={inputSize}
        output={output}
        outputLines={outputLines}
        outputSize={outputSize}
        onCopyOutput={() => void copyOutput()}
        onInputChange={(value) =>
          setState({ input: value, error: "" })
        }
      />

      <UsageSnippet classNameValue={className} />
    </div>
  );
}
