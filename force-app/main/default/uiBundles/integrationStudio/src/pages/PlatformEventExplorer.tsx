import { useMemo, useReducer } from "react";
import { createDataSDK } from "@salesforce/platform-sdk";
import {
  Activity,
  CheckCircle2,
  Clipboard,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  Send,
  XCircle
} from "lucide-react";
import { mergeState } from "../utils/state";

type EventFieldDefinition = {
  apiName: string;
  label: string;
  type: string;
  required: boolean;
  createable: boolean;
  length: number;
};

type EventDefinition = {
  apiName: string;
  label: string;
  labelPlural: string;
  fields: EventFieldDefinition[];
};

type EventListResponse = {
  totalSize: number;
  events: EventDefinition[];
};

type PublishResponse = {
  eventApiName: string;
  accepted: boolean;
  recordId: string | null;
  errors: string[];
};

type FieldValues = Record<string, string>;

const EVENTS_ENDPOINT =
  "/services/apexrest/integration-studio/events";

const SYSTEM_FIELDS = new Set([
  "CreatedById",
  "CreatedDate",
  "EventUuid",
  "ReplayId"
]);

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

function getInputType(fieldType: string): string {
  const normalizedType = fieldType.toLowerCase();

  if (
    normalizedType === "integer" ||
    normalizedType === "long" ||
    normalizedType === "double" ||
    normalizedType === "currency" ||
    normalizedType === "percent"
  ) {
    return "number";
  }

  if (normalizedType === "date") {
    return "date";
  }

  if (normalizedType === "datetime") {
    return "datetime-local";
  }

  return "text";
}

function preparePublishValues(
  event: EventDefinition,
  values: FieldValues
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  event.fields.forEach((field) => {
    const rawValue = values[field.apiName];

    if (
      !field.createable ||
      SYSTEM_FIELDS.has(field.apiName) ||
      rawValue === undefined ||
      rawValue.trim() === ""
    ) {
      return;
    }

    const normalizedType = field.type.toLowerCase();

    if (normalizedType === "boolean") {
      result[field.apiName] = rawValue === "true";
      return;
    }

    if (
      normalizedType === "integer" ||
      normalizedType === "long"
    ) {
      result[field.apiName] = Number.parseInt(rawValue, 10);
      return;
    }

    if (
      normalizedType === "double" ||
      normalizedType === "currency" ||
      normalizedType === "percent"
    ) {
      result[field.apiName] = Number(rawValue);
      return;
    }

    if (normalizedType === "datetime") {
      result[field.apiName] =
        new Date(rawValue).toISOString();
      return;
    }

    result[field.apiName] = rawValue;
  });

  return result;
}

type PlatformEventState = {
  copiedValue: string;
  error: string;
  events: EventDefinition[];
  fieldValues: FieldValues;
  loadDuration: number | null;
  loadingEvents: boolean;
  publishDuration: number | null;
  publishResult: PublishResponse | null;
  publishing: boolean;
  selectedEventName: string;
};

const initialPlatformEventState: PlatformEventState = {
  copiedValue: "",
  error: "",
  events: [],
  fieldValues: {},
  loadDuration: null,
  loadingEvents: false,
  publishDuration: null,
  publishResult: null,
  publishing: false,
  selectedEventName: ""
};

function PlatformEventHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
        <RadioTower size={24} />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Platform Event Explorer
        </h2>

        <p className="mt-1 text-gray-500">
          Consulte les Platform Events de l’org et publie un
          événement de test.
        </p>
      </div>
    </div>
  );
}

type EventSelectorProps = {
  events: EventDefinition[];
  loadDuration: number | null;
  loadingEvents: boolean;
  selectedEventName: string;
  onLoadEvents: () => void;
  onSelectedEventChange: (eventApiName: string) => void;
};

function EventSelector({
  events,
  loadDuration,
  loadingEvents,
  selectedEventName,
  onLoadEvents,
  onSelectedEventChange
}: EventSelectorProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label
            htmlFor="platformEvent"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Platform Event
          </label>

          <select
            id="platformEvent"
            value={selectedEventName}
            onChange={(event) =>
              onSelectedEventChange(event.target.value)
            }
            disabled={events.length === 0}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-mono text-sm text-gray-900 outline-none focus:border-indigo-500 disabled:bg-gray-100"
          >
            {events.length === 0 && (
              <option value="">Aucun événement chargé</option>
            )}

            {events.map((event) => (
              <option
                key={event.apiName}
                value={event.apiName}
              >
                {event.label} — {event.apiName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onLoadEvents}
          disabled={loadingEvents}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingEvents ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <RefreshCw size={17} />
          )}

          {loadingEvents ? "Loading..." : "Load events"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>{events.length} événement(s)</span>

        {loadDuration !== null && (
          <span>{loadDuration} ms</span>
        )}
      </div>
    </section>
  );
}

function EmptyEventState() {
  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
      <Activity size={38} className="mx-auto text-gray-300" />

      <h3 className="mt-4 font-semibold text-gray-800">
        Aucun Platform Event chargé
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        Clique sur Load events pour récupérer les événements de
        l’org.
      </p>
    </section>
  );
}

type EventDetailsPanelProps = {
  copiedValue: string;
  selectedEvent: EventDefinition;
  onCopyValue: (value: string, identifier: string) => void;
};

function EventDetailsPanel({
  copiedValue,
  selectedEvent,
  onCopyValue
}: EventDetailsPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              {selectedEvent.label}
            </h3>

            <p className="mt-1 font-mono text-xs text-gray-500">
              {selectedEvent.apiName}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onCopyValue(
                selectedEvent.apiName,
                "event-api-name"
              )
            }
            className="rounded-lg border border-gray-300 p-2 text-gray-500 transition hover:bg-white hover:text-indigo-700"
          >
            {copiedValue === "event-api-name" ? (
              <CheckCircle2 size={16} />
            ) : (
              <Clipboard size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="p-5">
        <h4 className="text-sm font-semibold text-gray-900">
          Champs disponibles
        </h4>

        <div className="mt-4 max-h-[650px] space-y-3 overflow-auto">
          {selectedEvent.fields.map((field) => (
            <div
              key={field.apiName}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">
                    {field.label}
                  </p>

                  <p className="mt-1 truncate font-mono text-xs text-gray-500">
                    {field.apiName}
                  </p>
                </div>

                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-xs text-indigo-700">
                  {field.type}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    field.createable
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {field.createable ? "Createable" : "Read only"}
                </span>

                {field.required && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                    Required
                  </span>
                )}

                {field.length > 0 && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                    Max {field.length}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type PublishEventPanelProps = {
  editableFields: EventFieldDefinition[];
  fieldValues: FieldValues;
  publishing: boolean;
  onFieldValueChange: (fieldApiName: string, value: string) => void;
  onPublish: () => void;
};

function PublishEventPanel({
  editableFields,
  fieldValues,
  publishing,
  onFieldValueChange,
  onPublish
}: PublishEventPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            Publish Test Event
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Renseigne uniquement les champs nécessaires.
          </p>
        </div>

        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || editableFields.length === 0}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishing ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <Send size={16} />
          )}

          {publishing ? "Publishing..." : "Publish event"}
        </button>
      </div>

      <div className="space-y-4 p-5">
        {editableFields.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Aucun champ publiable trouvé.
          </div>
        )}

        {editableFields.map((field) => {
          const normalizedType = field.type.toLowerCase();
          const fieldId = `platform-event-field-${field.apiName}`;

          return (
            <div key={field.apiName}>
              <label
                htmlFor={fieldId}
                className="mb-2 flex items-center justify-between gap-3 text-sm font-medium text-gray-700"
              >
                <span>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </span>

                <span className="font-mono text-xs font-normal text-gray-400">
                  {field.apiName}
                </span>
              </label>

              {normalizedType === "boolean" ? (
                <select
                  id={fieldId}
                  value={fieldValues[field.apiName] ?? ""}
                  onChange={(event) =>
                    onFieldValueChange(
                      field.apiName,
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Non renseigné</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  id={fieldId}
                  type={getInputType(field.type)}
                  value={fieldValues[field.apiName] ?? ""}
                  onChange={(event) =>
                    onFieldValueChange(
                      field.apiName,
                      event.target.value
                    )
                  }
                  maxLength={
                    field.length > 0 ? field.length : undefined
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PublishResultCard({
  publishDuration,
  publishResult
}: {
  publishDuration: number | null;
  publishResult: PublishResponse;
}) {
  return (
    <section
      className={`rounded-xl border p-5 ${
        publishResult.accepted
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {publishResult.accepted ? (
          <CheckCircle2
            size={22}
            className="mt-0.5 shrink-0 text-green-700"
          />
        ) : (
          <XCircle
            size={22}
            className="mt-0.5 shrink-0 text-red-700"
          />
        )}

        <div className="min-w-0">
          <h3
            className={`font-semibold ${
              publishResult.accepted
                ? "text-green-900"
                : "text-red-900"
            }`}
          >
            {publishResult.accepted
              ? "Événement accepté pour publication"
              : "Échec de la publication"}
          </h3>

          <div className="mt-3 space-y-2 font-mono text-sm">
            <p>Event: {publishResult.eventApiName}</p>

            {publishResult.recordId && (
              <p className="break-all">
                Record ID: {publishResult.recordId}
              </p>
            )}

            {publishDuration !== null && (
              <p>Duration: {publishDuration} ms</p>
            )}

            {publishResult.errors?.map((publishError) => (
              <p key={publishError} className="text-red-700">
                {publishError}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function usePlatformEventExplorer() {
  const [state, setState] = useReducer(
    mergeState<PlatformEventState>,
    initialPlatformEventState
  );

  const {
    copiedValue,
    error,
    events,
    fieldValues,
    loadDuration,
    loadingEvents,
    publishDuration,
    publishResult,
    publishing,
    selectedEventName
  } = state;

  const selectedEvent = useMemo(
    () =>
      events.find(
        (event) =>
          event.apiName === selectedEventName
      ) ?? null,
    [events, selectedEventName]
  );

  const editableFields = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }

    return selectedEvent.fields.filter(
      (field) =>
        field.createable &&
        !SYSTEM_FIELDS.has(field.apiName)
    );
  }, [selectedEvent]);

  const requiredFieldsMissing = useMemo(() => {
    return editableFields.filter(
      (field) =>
        field.required &&
        !fieldValues[field.apiName]?.trim()
    );
  }, [editableFields, fieldValues]);

  async function loadEvents() {
    setState({
      loadingEvents: true,
      error: "",
      publishResult: null,
      loadDuration: null
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
        EVENTS_ENDPOINT,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      const rawResponse = await response.text();

      const nextLoadDuration = Math.round(
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

      const data =
        JSON.parse(rawResponse) as EventListResponse;

      const sortedEvents = [...(data.events ?? [])].sort(
        (firstEvent, secondEvent) =>
          firstEvent.apiName.localeCompare(
            secondEvent.apiName
          )
      );

      if (sortedEvents.length > 0) {
        const firstEventName =
          selectedEventName &&
          sortedEvents.some(
            (event) =>
              event.apiName === selectedEventName
          )
            ? selectedEventName
            : sortedEvents[0].apiName;

        setState({
          events: sortedEvents,
          selectedEventName: firstEventName,
          fieldValues: {},
          loadDuration: nextLoadDuration
        });
      } else {
        setState({
          events: [],
          selectedEventName: "",
          fieldValues: {},
          loadDuration: nextLoadDuration
        });
      }
    } catch (currentError) {
      setState({
        events: [],
        selectedEventName: "",
        fieldValues: {},
        error:
          currentError instanceof Error
            ? currentError.message
            : "Impossible de charger les Platform Events."
      });
    } finally {
      setState({ loadingEvents: false });
    }
  }

  async function publishEvent() {
    if (!selectedEvent) {
      return;
    }

    if (requiredFieldsMissing.length > 0) {
      setState({
        error: `Champs obligatoires manquants : ${requiredFieldsMissing
          .map((field) => field.apiName)
          .join(", ")}`
      });
      return;
    }

    setState({
      publishing: true,
      error: "",
      publishResult: null,
      publishDuration: null
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
        EVENTS_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            eventApiName: selectedEvent.apiName,
            values: preparePublishValues(
              selectedEvent,
              fieldValues
            )
          })
        }
      );

      const rawResponse = await response.text();

      const nextPublishDuration = Math.round(
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

      const data =
        JSON.parse(rawResponse) as PublishResponse;

      setState({
        publishResult: data,
        publishDuration: nextPublishDuration
      });
    } catch (currentError) {
      setState({
        error:
          currentError instanceof Error
            ? currentError.message
            : "Impossible de publier le Platform Event."
      });
    } finally {
      setState({ publishing: false });
    }
  }

  async function copyValue(
    value: string,
    identifier: string
  ) {
    try {
      await navigator.clipboard.writeText(value);
      setState({ copiedValue: identifier });

      window.setTimeout(() => {
        setState({ copiedValue: "" });
      }, 1600);
    } catch {
      setState({
        error: "Impossible de copier la valeur."
      });
    }
  }

  function changeSelectedEvent(eventApiName: string) {
    setState({
      selectedEventName: eventApiName,
      fieldValues: {},
      publishResult: null,
      error: ""
    });
  }

  function changeFieldValue(
    fieldApiName: string,
    value: string
  ) {
    setState((currentState) => ({
      fieldValues: {
        ...currentState.fieldValues,
        [fieldApiName]: value
      }
    }));
  }

  return {
    changeFieldValue,
    changeSelectedEvent,
    copiedValue,
    copyValue,
    editableFields,
    error,
    events,
    fieldValues,
    loadDuration,
    loadingEvents,
    loadEvents,
    publishDuration,
    publishEvent,
    publishResult,
    publishing,
    selectedEvent,
    selectedEventName
  };
}

export default function PlatformEventExplorer() {
  const {
    changeFieldValue,
    changeSelectedEvent,
    copiedValue,
    copyValue,
    editableFields,
    error,
    events,
    fieldValues,
    loadDuration,
    loadingEvents,
    loadEvents,
    publishDuration,
    publishEvent,
    publishResult,
    publishing,
    selectedEvent,
    selectedEventName
  } = usePlatformEventExplorer();

  return (
    <div className="space-y-6">
      <PlatformEventHeader />

      <EventSelector
        events={events}
        loadDuration={loadDuration}
        loadingEvents={loadingEvents}
        selectedEventName={selectedEventName}
        onLoadEvents={() => void loadEvents()}
        onSelectedEventChange={changeSelectedEvent}
      />

      {error && (
        <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
          {error}
        </div>
      )}

      {!selectedEvent && !loadingEvents && (
        <EmptyEventState />
      )}

      {selectedEvent && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <EventDetailsPanel
            copiedValue={copiedValue}
            selectedEvent={selectedEvent}
            onCopyValue={(value, identifier) =>
              void copyValue(value, identifier)
            }
          />

          <PublishEventPanel
            editableFields={editableFields}
            fieldValues={fieldValues}
            publishing={publishing}
            onFieldValueChange={changeFieldValue}
            onPublish={() => void publishEvent()}
          />
        </div>
      )}

      {publishResult && (
        <PublishResultCard
          publishDuration={publishDuration}
          publishResult={publishResult}
        />
      )}
    </div>
  );
}
