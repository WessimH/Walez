import { useMemo, useReducer } from "react";
import { createDataSDK } from "@salesforce/platform-sdk";
import {
  Check,
  Clipboard,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck
} from "lucide-react";
import { mergeState } from "../utils/state";

type RawCredential = Record<string, unknown>;

type NamedCredentialItem = {
  id: string;
  name: string;
  label: string;
  endpoint: string;
  type: string;
  externalCredential: string;
  calloutEnabled: string;
  raw: RawCredential;
};

type DisplayMode = "cards" | "json";

const INTEGRATION_STUDIO_NC_ENDPOINT =
  "/services/apexrest/integration-studio/named-credentials";

function getStringValue(
  object: RawCredential,
  possibleKeys: string[]
): string {
  for (const key of possibleKeys) {
    const value = object[key];

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const nestedValue = value as RawCredential;

      const nestedName = getStringValue(nestedValue, [
        "name",
        "developerName",
        "label",
        "id"
      ]);

      if (nestedName) {
        return nestedName;
      }
    }
  }

  return "";
}

function normalizeCredential(
  credential: RawCredential,
  index: number
): NamedCredentialItem {
  const name = getStringValue(credential, [
    "developerName",
    "name",
    "fullName"
  ]);

  const label = getStringValue(credential, [
    "masterLabel",
    "label",
    "displayName"
  ]);

  const endpoint = getStringValue(credential, [
    "calloutUrl",
    "endpoint",
    "endpointUrl"
  ]);

  const type = getStringValue(credential, [
    "type",
    "credentialType",
    "authenticationProtocol"
  ]);

  const calloutEnabled = getStringValue(
    credential,
    [
      "calloutStatus",
      "enabled",
      "isEnabled",
      "isActive"
    ]
  );

  let externalCredential = "Aucun";

  const rawExternalCredentials =
    credential.externalCredentials;

  if (Array.isArray(rawExternalCredentials)) {
    const externalCredentialNames =
      rawExternalCredentials
        .flatMap((item) => {
          if (
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item)
          ) {
            const name = getStringValue(
              item as RawCredential,
              [
                "developerName",
                "name",
                "masterLabel",
                "label"
              ]
            );

            return name ? [name] : [];
          }

          if (typeof item === "string") {
            return item ? [item] : [];
          }

          return [];
        });

    if (externalCredentialNames.length > 0) {
      externalCredential =
        externalCredentialNames.join(", ");
    }
  }

  return {
    id:
      getStringValue(credential, ["id"]) ||
      name ||
      String(index),
    name: name || "Unnamed credential",
    label: label || name || "Unnamed credential",
    endpoint: endpoint || "Non disponible",
    type: type || "Non précisé",
    externalCredential,
    calloutEnabled:
      calloutEnabled || "Non précisé",
    raw: credential
  };
}

function parseCredentialResponse(
  rawResponse: string
): RawCredential[] {
  let parsed: unknown = JSON.parse(rawResponse);

  // Une méthode Apex REST retournant String peut produire
  // une chaîne JSON contenant elle-même du JSON.
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  if (Array.isArray(parsed)) {
    return parsed.filter(
      (item): item is RawCredential =>
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item)
    );
  }

  if (
    typeof parsed === "object" &&
    parsed !== null
  ) {
    const parsedObject = parsed as RawCredential;

    const possibleCollections = [
      parsedObject.namedCredentials,
      parsedObject.credentials,
      parsedObject.items,
      parsedObject.records
    ];

    for (const collection of possibleCollections) {
      if (Array.isArray(collection)) {
        return collection.filter(
          (item): item is RawCredential =>
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item)
        );
      }
    }

    return [parsedObject];
  }

  return [];
}

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

type NamedCredentialState = {
  copiedName: string;
  credentials: NamedCredentialItem[];
  displayMode: DisplayMode;
  duration: number | null;
  error: string;
  loading: boolean;
  rawCredentials: RawCredential[];
  searchTerm: string;
};

const initialNamedCredentialState: NamedCredentialState = {
  copiedName: "",
  credentials: [],
  displayMode: "cards",
  duration: null,
  error: "",
  loading: false,
  rawCredentials: [],
  searchTerm: ""
};

function NamedCredentialHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
        <KeyRound size={24} />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Named Credential Explorer
        </h2>

        <p className="mt-1 text-gray-500">
          Consulte les Named Credentials disponibles sans exposer
          leurs secrets.
        </p>
      </div>
    </div>
  );
}

type NamedCredentialToolbarProps = {
  displayMode: DisplayMode;
  duration: number | null;
  filteredCount: number;
  loading: boolean;
  searchTerm: string;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onLoad: () => void;
  onSearchChange: (value: string) => void;
};

function NamedCredentialToolbar({
  displayMode,
  duration,
  filteredCount,
  loading,
  searchTerm,
  onDisplayModeChange,
  onLoad,
  onSearchChange
}: NamedCredentialToolbarProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            aria-label="Rechercher une Named Credential"
            placeholder="Rechercher par nom, endpoint ou type..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onDisplayModeChange("cards")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              displayMode === "cards"
                ? "bg-emerald-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Cards
          </button>

          <button
            type="button"
            onClick={() => onDisplayModeChange("json")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              displayMode === "json"
                ? "bg-emerald-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            JSON
          </button>

          <button
            type="button"
            onClick={onLoad}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={17} />
            )}

            {loading ? "Loading..." : "Load credentials"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>{filteredCount} résultat(s)</span>

        {duration !== null && <span>{duration} ms</span>}

        <span className="flex items-center gap-1 text-emerald-700">
          <ShieldCheck size={14} />
          Secrets masqués
        </span>
      </div>
    </section>
  );
}

function EmptyCredentialsState() {
  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
      <KeyRound size={36} className="mx-auto text-gray-300" />

      <h3 className="mt-4 font-semibold text-gray-800">
        Aucun credential chargé
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        Clique sur Load credentials pour récupérer les Named
        Credentials de l’org.
      </p>
    </section>
  );
}

function RawCredentialsSection({
  rawCredentials
}: {
  rawCredentials: RawCredential[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="font-semibold text-gray-900">
          Raw ConnectApi response
        </h3>
      </div>

      <div className="p-5">
        <pre className="max-h-[750px] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-5 font-mono text-sm leading-6 text-gray-100">
          {JSON.stringify(rawCredentials, null, 2)}
        </pre>
      </div>
    </section>
  );
}

type CredentialCardsProps = {
  copiedName: string;
  credentials: NamedCredentialItem[];
  onCopyName: (credentialName: string) => void;
};

function CredentialCards({
  copiedName,
  credentials,
  onCopyName
}: CredentialCardsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {credentials.map((credential) => (
        <article
          key={credential.id}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="truncate font-semibold text-gray-900"
                  title={credential.label}
                >
                  {credential.label}
                </h3>

                <p
                  className="mt-1 truncate font-mono text-xs text-gray-500"
                  title={credential.name}
                >
                  {credential.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onCopyName(credential.name)}
                aria-label={`Copier le nom technique de ${credential.label}`}
                className="shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition hover:bg-white hover:text-emerald-700"
                title="Copier le nom technique"
              >
                {copiedName === credential.name ? (
                  <Check size={16} />
                ) : (
                  <Clipboard size={16} />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Endpoint
              </p>

              <p className="mt-1 break-all font-mono text-sm text-gray-700">
                {credential.endpoint}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Type
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {credential.type}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Enabled
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {credential.calloutEnabled}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                External Credential
              </p>

              <p className="mt-1 font-mono text-sm text-gray-700">
                {credential.externalCredential}
              </p>
            </div>

            {credential.endpoint !== "Non disponible" && (
              <div className="flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                <ExternalLink size={14} />
                Callout endpoint configuré
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function NamedCredentialExplorer() {
  const [state, setState] = useReducer(
    mergeState<NamedCredentialState>,
    initialNamedCredentialState
  );

  const {
    copiedName,
    credentials,
    displayMode,
    duration,
    error,
    loading,
    rawCredentials,
    searchTerm
  } = state;

  const filteredCredentials = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return credentials;
    }

    return credentials.filter((credential) => {
      return [
        credential.name,
        credential.label,
        credential.endpoint,
        credential.type,
        credential.externalCredential
      ].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [credentials, searchTerm]);

  async function loadCredentials() {
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

      const response = await dataSdk.fetch(
        INTEGRATION_STUDIO_NC_ENDPOINT,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      const rawResponse = await response.text();

      const nextDuration = Math.round(
        performance.now() - startTime
      );

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            rawResponse,
            response.status
          )
        );
      }

      const parsedCredentials =
        parseCredentialResponse(rawResponse);

      const normalizedCredentials =
        parsedCredentials.map(
          (credential, index) =>
            normalizeCredential(
              credential,
              index
            )
        );

      setState({
        rawCredentials: parsedCredentials,
        credentials: normalizedCredentials,
        duration: nextDuration
      });
    } catch (currentError) {
      setState({
        credentials: [],
        rawCredentials: [],
        error:
          currentError instanceof Error
            ? currentError.message
            : "Impossible de récupérer les Named Credentials."
      });
    } finally {
      setState({ loading: false });
    }
  }

  async function copyCredentialName(
    credentialName: string
  ) {
    try {
      await navigator.clipboard.writeText(
        credentialName
      );

      setState({ copiedName: credentialName });

      window.setTimeout(() => {
        setState({ copiedName: "" });
      }, 1600);
    } catch {
      setState({
        error:
          "Impossible de copier le nom du Named Credential."
      });
    }
  }

  return (
    <div className="space-y-6">
      <NamedCredentialHeader />

      <NamedCredentialToolbar
        displayMode={displayMode}
        duration={duration}
        filteredCount={filteredCredentials.length}
        loading={loading}
        searchTerm={searchTerm}
        onDisplayModeChange={(mode) =>
          setState({ displayMode: mode })
        }
        onLoad={() => void loadCredentials()}
        onSearchChange={(value) =>
          setState({ searchTerm: value })
        }
      />

      {error && (
        <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        credentials.length === 0 && (
          <EmptyCredentialsState />
        )}

      {displayMode === "json" &&
        rawCredentials.length > 0 && (
          <RawCredentialsSection
            rawCredentials={rawCredentials}
          />
        )}

      {displayMode === "cards" &&
        filteredCredentials.length > 0 && (
          <CredentialCards
            copiedName={copiedName}
            credentials={filteredCredentials}
            onCopyName={(credentialName) =>
              void copyCredentialName(credentialName)
            }
          />
        )}

      {credentials.length > 0 &&
        filteredCredentials.length === 0 && (
          <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Aucun Named Credential ne correspond à la
            recherche.
          </section>
        )}
    </div>
  );
}
