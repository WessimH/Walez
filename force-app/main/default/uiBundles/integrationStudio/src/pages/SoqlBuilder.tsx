import { useMemo, useReducer } from "react";
import { loadApplicationSettings } from "../utils/settings";
import { createDataSDK } from "@salesforce/platform-sdk";
import {
  Check,
  Clipboard,
  Database,
  LoaderCircle,
  Play,
  Plus,
  RotateCcw,
  Trash2
} from "lucide-react";
import { mergeState } from "../utils/state";

type SalesforceObject = {
  name: string;
  label: string;
  fields: string[];
};

type FilterCondition = {
  id: number;
  field: string;
  operator: string;
  value: string;
  connector: "AND" | "OR";
};

type QueryRecord = Record<string, unknown>;

type QueryResponse = {
  totalSize: number;
  done: boolean;
  records: QueryRecord[];
};

type ResultView = "table" | "json";

const applicationSettings =
  loadApplicationSettings();

const SALESFORCE_OBJECTS: SalesforceObject[] = [
  {
    name: "Account",
    label: "Account",
    fields: [
      "Id",
      "Name",
      "Industry",
      "Phone",
      "Website",
      "BillingCity",
      "BillingCountry",
      "AnnualRevenue",
      "NumberOfEmployees",
      "OwnerId",
      "CreatedDate",
      "LastModifiedDate"
    ]
  },
  {
    name: "Contact",
    label: "Contact",
    fields: [
      "Id",
      "FirstName",
      "LastName",
      "Name",
      "Email",
      "Phone",
      "MobilePhone",
      "Title",
      "Department",
      "AccountId",
      "MailingCity",
      "MailingCountry",
      "CreatedDate"
    ]
  },
  {
    name: "Lead",
    label: "Lead",
    fields: [
      "Id",
      "FirstName",
      "LastName",
      "Name",
      "Company",
      "Email",
      "Phone",
      "Status",
      "Industry",
      "Rating",
      "LeadSource",
      "CreatedDate"
    ]
  },
  {
    name: "Opportunity",
    label: "Opportunity",
    fields: [
      "Id",
      "Name",
      "AccountId",
      "StageName",
      "Amount",
      "Probability",
      "CloseDate",
      "Type",
      "LeadSource",
      "OwnerId",
      "CreatedDate"
    ]
  },
  {
    name: "Case",
    label: "Case",
    fields: [
      "Id",
      "CaseNumber",
      "Subject",
      "Status",
      "Priority",
      "Origin",
      "AccountId",
      "ContactId",
      "OwnerId",
      "CreatedDate",
      "ClosedDate"
    ]
  },
  {
    name: "User",
    label: "User",
    fields: [
      "Id",
      "Name",
      "FirstName",
      "LastName",
      "Email",
      "Username",
      "Alias",
      "IsActive",
      "ProfileId",
      "UserRoleId",
      "CreatedDate"
    ]
  }
];

const OPERATORS = [
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "LIKE",
  "IN",
  "NOT IN",
  "INCLUDES",
  "EXCLUDES"
];

function escapeSoqlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function formatFilterValue(
  operator: string,
  rawValue: string
): string {
  const value = rawValue.trim();

  if (!value) {
    return "''";
  }

  const upperValue = value.toUpperCase();

  if (
    upperValue === "NULL" ||
    upperValue === "TRUE" ||
    upperValue === "FALSE"
  ) {
    return upperValue.toLowerCase();
  }

  if (!Number.isNaN(Number(value))) {
    return value;
  }

  if (
    operator === "IN" ||
    operator === "NOT IN" ||
    operator === "INCLUDES" ||
    operator === "EXCLUDES"
  ) {
    const values = value
      .split(",")
      .flatMap((item) => {
        const trimmedValue = item.trim();

        if (!trimmedValue) {
          return [];
        }

        return [`'${escapeSoqlString(trimmedValue)}'`];
      });

    return `(${values.join(", ")})`;
  }

  return `'${escapeSoqlString(value)}'`;
}

function flattenRecord(
  record: QueryRecord,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  Object.entries(record).forEach(([key, value]) => {
    if (key === "attributes") {
      return;
    }

    const columnName = prefix
      ? `${prefix}.${key}`
      : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(
        result,
        flattenRecord(value as QueryRecord, columnName)
      );

      return;
    }

    result[columnName] = value;
  });

  return result;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function extractSalesforceError(
  rawResponse: string,
  status: number
): string {
  let message = `Erreur Salesforce HTTP ${status}`;

  try {
    const parsedError: unknown = JSON.parse(rawResponse);

    if (
      Array.isArray(parsedError) &&
      typeof parsedError[0]?.message === "string"
    ) {
      return parsedError[0].message;
    }

    if (
      typeof parsedError === "object" &&
      parsedError !== null &&
      "message" in parsedError &&
      typeof parsedError.message === "string"
    ) {
      return parsedError.message;
    }
  } catch {
    if (rawResponse.trim()) {
      message = rawResponse;
    }
  }

  return message;
}

type SoqlBuilderState = {
  copied: boolean;
  customField: string;
  filters: FilterCondition[];
  limitValue: string;
  objectName: string;
  orderBy: string;
  orderDirection: "ASC" | "DESC";
  queryDuration: number | null;
  queryError: string;
  queryLoading: boolean;
  queryResults: QueryRecord[];
  resultView: ResultView;
  selectedFields: string[];
  totalSize: number | null;
};

const initialSoqlBuilderState: SoqlBuilderState = {
  copied: false,
  customField: "",
  filters: [],
  limitValue: String(applicationSettings.defaultSoqlLimit),
  objectName: "Account",
  orderBy: "",
  orderDirection: "ASC",
  queryDuration: null,
  queryError: "",
  queryLoading: false,
  queryResults: [],
  resultView: applicationSettings.defaultResultView,
  selectedFields: ["Id", "Name"],
  totalSize: null
};

function SoqlBuilderHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
        <Database size={24} />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          SOQL Builder
        </h2>

        <p className="mt-1 text-gray-500">
          Construis et exécute une requête SOQL Salesforce.
        </p>
      </div>
    </div>
  );
}

function ObjectSelector({
  objectName,
  onObjectChange
}: {
  objectName: string;
  onObjectChange: (objectName: string) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">
        Objet Salesforce
      </h3>

      <select
        value={objectName}
        onChange={(event) =>
          onObjectChange(event.target.value)
        }
        className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none focus:border-blue-500"
      >
        {SALESFORCE_OBJECTS.map((salesforceObject) => (
          <option
            key={salesforceObject.name}
            value={salesforceObject.name}
          >
            {salesforceObject.label}
          </option>
        ))}
      </select>
    </section>
  );
}

type FieldSelectorProps = {
  currentObject: SalesforceObject;
  customField: string;
  selectedFields: string[];
  onAddCustomField: () => void;
  onCustomFieldChange: (value: string) => void;
  onSelectAllFields: () => void;
  onToggleField: (fieldName: string) => void;
};

function FieldSelector({
  currentObject,
  customField,
  selectedFields,
  onAddCustomField,
  onCustomFieldChange,
  onSelectAllFields,
  onToggleField
}: FieldSelectorProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Champs
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {selectedFields.length} champ(s) sélectionné(s)
          </p>
        </div>

        <button
          type="button"
          onClick={onSelectAllFields}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Select all
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {currentObject.fields.map((field) => (
          <label
            key={field}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedFields.includes(field)}
              onChange={() => onToggleField(field)}
              className="h-4 w-4 rounded border-gray-300"
            />

            <span className="font-mono text-gray-700">
              {field}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          type="text"
          value={customField}
          onChange={(event) =>
            onCustomFieldChange(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onAddCustomField();
            }
          }}
          aria-label="Ajouter un champ personnalisé"
          placeholder="Mon_champ__c ou Account.Name"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={onAddCustomField}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    </section>
  );
}

type FiltersSectionProps = {
  allAvailableFields: string[];
  filters: FilterCondition[];
  onAddFilter: () => void;
  onRemoveFilter: (id: number) => void;
  onUpdateFilter: (
    id: number,
    fieldName: keyof Omit<FilterCondition, "id">,
    value: string
  ) => void;
};

function FiltersSection({
  allAvailableFields,
  filters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter
}: FiltersSectionProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Filtres
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Génère la clause WHERE.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddFilter}
            aria-label="Ajouter un filtre"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Plus size={16} />
          Add filter
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {filters.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
            Aucun filtre ajouté.
          </div>
        )}

        {filters.map((filter, index) => (
          <div
            key={filter.id}
            className="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[90px_1fr_120px_1fr_auto]"
          >
            {index === 0 ? (
              <div className="flex items-center justify-center text-xs font-medium text-gray-400">
                WHERE
              </div>
            ) : (
              <select
                value={filter.connector}
                onChange={(event) =>
                  onUpdateFilter(
                    filter.id,
                    "connector",
                    event.target.value
                  )
                }
                  aria-label={`Connecteur du filtre ${filter.id}`}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}

            <input
              type="text"
              value={filter.field}
              onChange={(event) =>
                onUpdateFilter(
                  filter.id,
                  "field",
                  event.target.value
                )
              }
              list={`fields-${filter.id}`}
                aria-label={`Champ du filtre ${filter.id}`}
              placeholder="Field"
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
            />

            <datalist id={`fields-${filter.id}`}>
              {allAvailableFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
              ))}
            </datalist>

            <select
              value={filter.operator}
              onChange={(event) =>
                onUpdateFilter(
                  filter.id,
                  "operator",
                  event.target.value
                )
              }
                aria-label={`Opérateur du filtre ${filter.id}`}
              className="rounded-lg border border-gray-300 px-2 py-2 font-mono text-sm outline-none focus:border-blue-500"
            >
              {OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={filter.value}
              onChange={(event) =>
                onUpdateFilter(
                  filter.id,
                  "value",
                  event.target.value
                )
              }
                aria-label={`Valeur du filtre ${filter.id}`}
              placeholder={
                filter.operator === "IN" ||
                filter.operator === "NOT IN"
                  ? "France, Suisse"
                  : "Value"
              }
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
            />

            <button
              type="button"
              onClick={() => onRemoveFilter(filter.id)}
              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type SortLimitSectionProps = {
  allAvailableFields: string[];
  limitValue: string;
  orderBy: string;
  orderDirection: "ASC" | "DESC";
  onLimitChange: (value: string) => void;
  onOrderByChange: (value: string) => void;
  onOrderDirectionChange: (value: "ASC" | "DESC") => void;
};

function SortLimitSection({
  allAvailableFields,
  limitValue,
  orderBy,
  orderDirection,
  onLimitChange,
  onOrderByChange,
  onOrderDirectionChange
}: SortLimitSectionProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">
        Tri et limite
      </h3>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="soqlOrderBy"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            ORDER BY
          </label>

          <select
            id="soqlOrderBy"
            value={orderBy}
            onChange={(event) =>
              onOrderByChange(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
          >
            <option value="">Aucun tri</option>

            {allAvailableFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="soqlOrderDirection"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Direction
          </label>

          <select
            id="soqlOrderDirection"
            value={orderDirection}
            onChange={(event) =>
              onOrderDirectionChange(
                event.target.value as "ASC" | "DESC"
              )
            }
            disabled={!orderBy}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="soqlLimit"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            LIMIT
          </label>

          <input
            id="soqlLimit"
            type="number"
            min="1"
            max="50000"
            value={limitValue}
            onChange={(event) =>
              onLimitChange(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </section>
  );
}

type QueryOutputPanelProps = {
  copied: boolean;
  generatedQuery: string;
  queryLoading: boolean;
  onCopy: () => void;
  onReset: () => void;
  onRun: () => void;
};

function QueryOutputPanel({
  copied,
  generatedQuery,
  queryLoading,
  onCopy,
  onReset,
  onRun
}: QueryOutputPanelProps) {
  return (
    <section className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-6">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            SOQL Output
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {generatedQuery.length} caractères
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={queryLoading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {queryLoading ? (
              <LoaderCircle
                size={14}
                className="animate-spin"
              />
            ) : (
              <Play size={14} />
            )}

            {queryLoading ? "Running..." : "Run Query"}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="p-5">
        <pre className="min-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-5 font-mono text-sm leading-7 text-gray-100">
          {generatedQuery}
        </pre>
      </div>
    </section>
  );
}

type QueryResultsPanelProps = {
  flattenedResults: Record<string, unknown>[];
  queryDuration: number | null;
  queryError: string;
  queryLoading: boolean;
  queryResults: QueryRecord[];
  resultColumns: string[];
  resultView: ResultView;
  totalSize: number | null;
  onResultViewChange: (view: ResultView) => void;
};

function QueryResultsPanel({
  flattenedResults,
  queryDuration,
  queryError,
  queryLoading,
  queryResults,
  resultColumns,
  resultView,
  totalSize,
  onResultViewChange
}: QueryResultsPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Query Results
          </h3>

          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
            {totalSize !== null && (
              <span>
                {queryResults.length} chargé(s) sur {totalSize}
              </span>
            )}

            {queryDuration !== null && (
              <span>{queryDuration} ms</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onResultViewChange("table")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              resultView === "table"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Table
          </button>

          <button
            type="button"
            onClick={() => onResultViewChange("json")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              resultView === "json"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      {queryError ? (
        <div className="m-5 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
          {queryError}
        </div>
      ) : queryLoading && queryResults.length === 0 ? (
        <div className="flex items-center justify-center gap-3 p-10 text-sm text-gray-500">
          <LoaderCircle size={20} className="animate-spin" />
          Exécution de la requête…
        </div>
      ) : queryResults.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">
          Lance une requête pour afficher les résultats.
        </div>
      ) : resultView === "json" ? (
        <div className="p-5">
          <pre className="max-h-[650px] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-4 font-mono text-sm leading-6 text-gray-100">
            {JSON.stringify(queryResults, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                {resultColumns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap border-b border-gray-200 px-4 py-3 font-mono text-xs font-semibold text-gray-700"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {flattenedResults.map((record, recordIndex) => (
                <tr
                  key={recordIndex}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  {resultColumns.map((column) => (
                    <td
                      key={column}
                      className="max-w-sm whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700"
                      title={formatCellValue(record[column])}
                    >
                      {formatCellValue(record[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function useSoqlBuilder() {
  const [state, setState] = useReducer(
    mergeState<SoqlBuilderState>,
    initialSoqlBuilderState
  );

  const {
    copied,
    customField,
    filters,
    limitValue,
    objectName,
    orderBy,
    orderDirection,
    queryDuration,
    queryError,
    queryLoading,
    queryResults,
    resultView,
    selectedFields,
    totalSize
  } = state;

  const currentObject = useMemo(
    () =>
      SALESFORCE_OBJECTS.find(
        (currentItem) => currentItem.name === objectName
      ) ?? SALESFORCE_OBJECTS[0],
    [objectName]
  );

  const allAvailableFields = useMemo(() => {
    return Array.from(
      new Set([...currentObject.fields, ...selectedFields])
    );
  }, [currentObject, selectedFields]);

  const generatedQuery = useMemo(() => {
    const fields =
      selectedFields.length > 0
        ? selectedFields.join(", ")
        : "Id";

    const lines = [
      `SELECT ${fields}`,
      `FROM ${objectName}`
    ];

    const activeFilters = filters.filter(
      (filter) => filter.field.trim()
    );

    if (activeFilters.length > 0) {
      const whereConditions = activeFilters.map(
        (filter, index) => {
          const condition =
            `${filter.field.trim()} ` +
            `${filter.operator} ` +
            `${formatFilterValue(
              filter.operator,
              filter.value
            )}`;

          if (index === 0) {
            return condition;
          }

          return `${filter.connector} ${condition}`;
        }
      );

      lines.push(
        `WHERE ${whereConditions.join("\n  ")}`
      );
    }

    if (orderBy.trim()) {
      lines.push(
        `ORDER BY ${orderBy.trim()} ${orderDirection}`
      );
    }

    const parsedLimit = Number(limitValue);

    if (
      Number.isInteger(parsedLimit) &&
      parsedLimit > 0
    ) {
      lines.push(`LIMIT ${parsedLimit}`);
    }

    return lines.join("\n");
  }, [
    selectedFields,
    objectName,
    filters,
    orderBy,
    orderDirection,
    limitValue
  ]);

  const flattenedResults = useMemo(
    () =>
      queryResults.map((record) =>
        flattenRecord(record)
      ),
    [queryResults]
  );

  const resultColumns = useMemo(() => {
    const columns = new Set<string>();

    flattenedResults.forEach((record) => {
      Object.keys(record).forEach((key) => {
        columns.add(key);
      });
    });

    return Array.from(columns);
  }, [flattenedResults]);

  function changeObject(newObjectName: string) {
    const newObject = SALESFORCE_OBJECTS.find(
      (currentItem) =>
        currentItem.name === newObjectName
    );

    setState({
      objectName: newObjectName,
      selectedFields: newObject?.fields.slice(0, 2) ?? ["Id"],
      filters: [],
      orderBy: "",
      queryResults: [],
      totalSize: null,
      queryError: "",
      queryDuration: null
    });
  }

  function toggleField(fieldName: string) {
    setState((currentState) => ({
      selectedFields: currentState.selectedFields.includes(fieldName)
        ? currentState.selectedFields.filter(
            (field) => field !== fieldName
          )
        : [...currentState.selectedFields, fieldName]
    }));
  }

  function addCustomField() {
    const normalizedField = customField.trim();

    if (!normalizedField) {
      return;
    }

    setState((currentState) => ({
      selectedFields: currentState.selectedFields.includes(normalizedField)
        ? currentState.selectedFields
        : [...currentState.selectedFields, normalizedField],
      customField: ""
    }));
  }

  function addFilter() {
    setState((currentState) => ({
      filters: [
        ...currentState.filters,
        {
          id: Date.now(),
          field: "",
          operator: "=",
          value: "",
          connector: "AND"
        }
      ]
    }));
  }

  function updateFilter(
    id: number,
    fieldName: keyof Omit<FilterCondition, "id">,
    value: string
  ) {
    setState((currentState) => ({
      filters: currentState.filters.map((filter) =>
        filter.id === id
          ? {
              ...filter,
              [fieldName]: value
            }
          : filter
      )
    }));
  }

  function removeFilter(id: number) {
    setState((currentState) => ({
      filters: currentState.filters.filter(
        (filter) => filter.id !== id
      )
    }));
  }

  function resetBuilder() {
    setState(initialSoqlBuilderState);
  }

  async function copyQuery() {
    try {
      await navigator.clipboard.writeText(
        generatedQuery
      );

      setState({ copied: true });

      window.setTimeout(() => {
        setState({ copied: false });
      }, 1600);
    } catch {
      setState({ copied: false });
    }
  }

  async function runQuery() {
    setState({
      queryResults: [],
      totalSize: null,
      queryError: "",
      queryDuration: null,
      queryLoading: true
    });

    const startTime = performance.now();

    try {
      const dataSdk = await createDataSDK();

      if (!dataSdk.fetch) {
        throw new Error(
          "Le service Fetch du Salesforce Platform SDK n’est pas disponible."
        );
      }

      const response = await dataSdk.fetch(
        "/services/apexrest/integration-studio/soql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            query: generatedQuery
          })
        }
      );

      const rawResponse = await response.text();

      const nextQueryDuration = Math.round(
        performance.now() - startTime
      );

      if (!response.ok) {
        throw new Error(
          extractSalesforceError(
            rawResponse,
            response.status
          )
        );
      }

      const data = JSON.parse(rawResponse) as QueryResponse;

      setState({
        queryResults: data.records ?? [],
        totalSize: data.totalSize ?? 0,
        queryDuration: nextQueryDuration
      });
    } catch (currentError) {
      setState({
        queryResults: [],
        totalSize: null,
        queryError:
          currentError instanceof Error
            ? currentError.message
            : "Impossible d’exécuter la requête SOQL."
      });
    } finally {
      setState({ queryLoading: false });
    }
  }

  function changeCustomField(value: string) {
    setState({ customField: value });
  }

  function selectAllFields() {
    setState({
      selectedFields: currentObject.fields
    });
  }

  function changeLimit(value: string) {
    setState({ limitValue: value });
  }

  function changeOrderBy(value: string) {
    setState({ orderBy: value });
  }

  function changeOrderDirection(
    value: SoqlBuilderState["orderDirection"]
  ) {
    setState({ orderDirection: value });
  }

  function changeResultView(view: ResultView) {
    setState({ resultView: view });
  }

  return {
    addCustomField,
    addFilter,
    allAvailableFields,
    changeCustomField,
    changeLimit,
    changeObject,
    changeOrderBy,
    changeOrderDirection,
    changeResultView,
    copied,
    currentObject,
    customField,
    filters,
    flattenedResults,
    generatedQuery,
    limitValue,
    objectName,
    orderBy,
    orderDirection,
    queryDuration,
    queryError,
    queryLoading,
    queryResults,
    removeFilter,
    resetBuilder,
    resultColumns,
    resultView,
    runQuery,
    selectAllFields,
    selectedFields,
    toggleField,
    totalSize,
    updateFilter,
    copyQuery
  };
}

export default function SoqlBuilder() {
  const {
    addCustomField,
    addFilter,
    allAvailableFields,
    changeCustomField,
    changeLimit,
    changeObject,
    changeOrderBy,
    changeOrderDirection,
    changeResultView,
    copied,
    currentObject,
    customField,
    filters,
    flattenedResults,
    generatedQuery,
    limitValue,
    objectName,
    orderBy,
    orderDirection,
    queryDuration,
    queryError,
    queryLoading,
    queryResults,
    removeFilter,
    resetBuilder,
    resultColumns,
    resultView,
    runQuery,
    selectAllFields,
    selectedFields,
    toggleField,
    totalSize,
    updateFilter,
    copyQuery
  } = useSoqlBuilder();

  return (
    <div className="space-y-6">
      <SoqlBuilderHeader />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <ObjectSelector
            objectName={objectName}
            onObjectChange={changeObject}
          />

          <FieldSelector
            currentObject={currentObject}
            customField={customField}
            selectedFields={selectedFields}
            onAddCustomField={addCustomField}
            onCustomFieldChange={changeCustomField}
            onSelectAllFields={selectAllFields}
            onToggleField={toggleField}
          />

          <FiltersSection
            allAvailableFields={allAvailableFields}
            filters={filters}
            onAddFilter={addFilter}
            onRemoveFilter={removeFilter}
            onUpdateFilter={updateFilter}
          />

          <SortLimitSection
            allAvailableFields={allAvailableFields}
            limitValue={limitValue}
            orderBy={orderBy}
            orderDirection={orderDirection}
            onLimitChange={changeLimit}
            onOrderByChange={changeOrderBy}
            onOrderDirectionChange={changeOrderDirection}
          />
        </div>

        <QueryOutputPanel
          copied={copied}
          generatedQuery={generatedQuery}
          queryLoading={queryLoading}
          onCopy={() => void copyQuery()}
          onReset={resetBuilder}
          onRun={() => void runQuery()}
        />
      </div>

      <QueryResultsPanel
        flattenedResults={flattenedResults}
        queryDuration={queryDuration}
        queryError={queryError}
        queryLoading={queryLoading}
        queryResults={queryResults}
        resultColumns={resultColumns}
        resultView={resultView}
        totalSize={totalSize}
        onResultViewChange={changeResultView}
      />
    </div>
  );
}
