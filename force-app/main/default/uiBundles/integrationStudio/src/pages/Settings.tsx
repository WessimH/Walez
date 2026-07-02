import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Monitor,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";

type ThemeMode = "light" | "dark" | "system";
type ResultView = "table" | "json";

type ApplicationSettings = {
  theme: ThemeMode;
  salesforceApiVersion: string;
  defaultSoqlLimit: number;
  defaultResultView: ResultView;
  autoLoadNamedCredentials: boolean;
  autoLoadPlatformEvents: boolean;
  confirmPlatformEventPublish: boolean;
  compactMode: boolean;
};

type UpdateSetting = <K extends keyof ApplicationSettings>(
  settingName: K,
  value: ApplicationSettings[K]
) => void;

const SETTINGS_STORAGE_KEY =
  "salesforce-integration-studio-settings";

const DEFAULT_SETTINGS: ApplicationSettings = {
  theme: "light",
  salesforceApiVersion: "v66.0",
  defaultSoqlLimit: 100,
  defaultResultView: "table",
  autoLoadNamedCredentials: false,
  autoLoadPlatformEvents: false,
  confirmPlatformEventPublish: true,
  compactMode: false
};

function loadStoredSettings(): ApplicationSettings {
  try {
    const storedValue = localStorage.getItem(
      SETTINGS_STORAGE_KEY
    );

    if (!storedValue) {
      return DEFAULT_SETTINGS;
    }

    const parsedSettings = JSON.parse(
      storedValue
    ) as Partial<ApplicationSettings>;

    return {
      ...DEFAULT_SETTINGS,
      ...parsedSettings
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyTheme(theme: ThemeMode) {
  const rootElement = document.documentElement;

  const systemPrefersDark =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  const darkModeEnabled =
    theme === "dark" ||
    (theme === "system" && systemPrefersDark);

  rootElement.classList.toggle(
    "dark",
    darkModeEnabled
  );

  rootElement.style.colorScheme =
    darkModeEnabled ? "dark" : "light";
}

type ToggleSettingProps = {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
};

function ToggleSetting({
  checked,
  title,
  description,
  onChange
}: ToggleSettingProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50">
      <div>
        <p className="font-medium text-gray-900">
          {title}
        </p>

        <p className="mt-1 text-sm leading-5 text-gray-500">
          {description}
        </p>
      </div>

      <div className="relative mt-1 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
          className="peer sr-only"
        />

        <div className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-blue-600" />

        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

function SettingsHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-gray-200 p-3 text-gray-700">
        <Settings2 size={24} />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Settings
        </h2>

        <p className="mt-1 text-gray-500">
          Configure les préférences de Salesforce Integration Studio.
        </p>
      </div>
    </div>
  );
}

function LocalStorageNotice() {
  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex gap-3">
        <ShieldCheck
          size={21}
          className="mt-0.5 shrink-0 text-blue-700"
        />

        <div>
          <h3 className="font-semibold text-blue-900">
            Stockage local
          </h3>

          <p className="mt-1 text-sm text-blue-700">
            Ces préférences sont uniquement enregistrées dans le
            navigateur.
          </p>
        </div>
      </div>
    </section>
  );
}

function InterfaceSettings({
  settings,
  updateSetting
}: {
  settings: ApplicationSettings;
  updateSetting: UpdateSetting;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <Monitor size={19} className="text-purple-600" />

        <div>
          <h3 className="font-semibold text-gray-900">
            Interface
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Apparence générale de l’application.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <label
            htmlFor="theme"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Thème
          </label>

          <select
            id="theme"
            value={settings.theme}
            onChange={(event) =>
              updateSetting(
                "theme",
                event.target.value as ThemeMode
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-purple-500"
          >
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
            <option value="system">Préférence du système</option>
          </select>

          <p className="mt-2 text-xs text-gray-500">
            Le thème sombre sera pleinement visible une fois les
            variantes dark ajoutées aux autres composants.
          </p>
        </div>

        <ToggleSetting
          checked={settings.compactMode}
          title="Mode compact"
          description="Réduit les espacements afin d’afficher davantage d’informations."
          onChange={(checked) =>
            updateSetting("compactMode", checked)
          }
        />
      </div>
    </section>
  );
}

function SalesforceSettings({
  settings,
  updateSetting
}: {
  settings: ApplicationSettings;
  updateSetting: UpdateSetting;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <Database size={19} className="text-blue-600" />

        <div>
          <h3 className="font-semibold text-gray-900">
            Salesforce
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Valeurs utilisées par les outils Salesforce.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <label
            htmlFor="apiVersion"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Version de l’API Salesforce
          </label>

          <select
            id="apiVersion"
            value={settings.salesforceApiVersion}
            onChange={(event) =>
              updateSetting(
                "salesforceApiVersion",
                event.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500"
          >
            <option value="v66.0">v66.0</option>
            <option value="v65.0">v65.0</option>
            <option value="v64.0">v64.0</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="soqlLimit"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Limite SOQL par défaut
          </label>

          <input
            id="soqlLimit"
            type="number"
            min="1"
            max="50000"
            value={settings.defaultSoqlLimit}
            onChange={(event) => {
              const parsedValue = Number(event.target.value);

              updateSetting(
                "defaultSoqlLimit",
                Number.isFinite(parsedValue)
                  ? parsedValue
                  : 100
              );
            }}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm outline-none focus:border-blue-500"
          />

          <p className="mt-2 text-xs text-gray-500">
            Cette valeur pourra être utilisée comme LIMIT initial
            dans le SOQL Builder.
          </p>
        </div>

        <div>
          <label
            htmlFor="resultView"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Affichage des résultats par défaut
          </label>

          <select
            id="resultView"
            value={settings.defaultResultView}
            onChange={(event) =>
              updateSetting(
                "defaultResultView",
                event.target.value as ResultView
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
          >
            <option value="table">Tableau</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>
    </section>
  );
}

function AutoLoadSettings({
  settings,
  updateSetting
}: {
  settings: ApplicationSettings;
  updateSetting: UpdateSetting;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <SlidersHorizontal
          size={19}
          className="text-emerald-600"
        />

        <div>
          <h3 className="font-semibold text-gray-900">
            Chargement automatique
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Automatise le chargement de certaines données.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <ToggleSetting
          checked={settings.autoLoadNamedCredentials}
          title="Charger les Named Credentials"
          description="Charge automatiquement les Named Credentials à l’ouverture de leur page."
          onChange={(checked) =>
            updateSetting("autoLoadNamedCredentials", checked)
          }
        />

        <ToggleSetting
          checked={settings.autoLoadPlatformEvents}
          title="Charger les Platform Events"
          description="Charge automatiquement les Platform Events à l’ouverture de leur page."
          onChange={(checked) =>
            updateSetting("autoLoadPlatformEvents", checked)
          }
        />
      </div>
    </section>
  );
}

function SecuritySettings({
  settings,
  updateSetting
}: {
  settings: ApplicationSettings;
  updateSetting: UpdateSetting;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <ShieldCheck size={19} className="text-orange-600" />

        <div>
          <h3 className="font-semibold text-gray-900">
            Sécurité
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Confirmations avant les actions sensibles.
          </p>
        </div>
      </div>

      <div className="p-5">
        <ToggleSetting
          checked={settings.confirmPlatformEventPublish}
          title="Confirmer la publication"
          description="Demande une confirmation avant la publication d’un Platform Event."
          onChange={(checked) =>
            updateSetting("confirmPlatformEventPublish", checked)
          }
        />
      </div>
    </section>
  );
}

function SettingsActions({
  saved,
  onReset,
  onSave
}: {
  saved: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold text-gray-900">
          Enregistrer les préférences
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Les paramètres seront conservés dans ce navigateur.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 hover:text-red-800"
        >
          <RefreshCw size={16} />
          Reset
        </button>

        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {saved ? (
            <CheckCircle2 size={17} />
          ) : (
            <Save size={17} />
          )}

          {saved ? "Saved" : "Save settings"}
        </button>
      </div>
    </section>
  );
}

export default function Settings() {
  const [settings, setSettings] =
    useState<ApplicationSettings>(
      loadStoredSettings
    );

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  function updateSetting<
    K extends keyof ApplicationSettings
  >(
    settingName: K,
    value: ApplicationSettings[K]
  ) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [settingName]: value
    }));

    setSaved(false);
  }

  function saveSettings() {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );

    applyTheme(settings.theme);
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(DEFAULT_SETTINGS)
    );

    applyTheme(DEFAULT_SETTINGS.theme);
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      <SettingsHeader />

      <LocalStorageNotice />

      <div className="grid gap-6 xl:grid-cols-2">
        <InterfaceSettings
          settings={settings}
          updateSetting={updateSetting}
        />

        <SalesforceSettings
          settings={settings}
          updateSetting={updateSetting}
        />

        <AutoLoadSettings
          settings={settings}
          updateSetting={updateSetting}
        />

        <SecuritySettings
          settings={settings}
          updateSetting={updateSetting}
        />
      </div>

      <SettingsActions
        saved={saved}
        onReset={resetSettings}
        onSave={saveSettings}
      />
    </div>
  );
}
