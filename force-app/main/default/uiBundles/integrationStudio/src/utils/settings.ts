export type ThemeMode = "light" | "dark" | "system";
export type ResultView = "table" | "json";

export type ApplicationSettings = {
  theme: ThemeMode;
  salesforceApiVersion: string;
  defaultSoqlLimit: number;
  defaultResultView: ResultView;
  autoLoadNamedCredentials: boolean;
  autoLoadPlatformEvents: boolean;
  confirmPlatformEventPublish: boolean;
  compactMode: boolean;
};

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

export function loadApplicationSettings(): ApplicationSettings {
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