import type { AssistPipeline } from "../../../../../src/data/assist_pipeline";
import type { ConfigEntry } from "../../../../../src/data/config_entries";
import type {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../../../../src/data/entity/entity_registry";
import type { LovelaceRawConfig } from "../../../../../src/data/lovelace/config/types";
import type {
  HassioHostInfo,
  HostDisksUsage,
} from "../../../../../src/data/hassio/host";
import type { MediaPlayerItem } from "../../../../../src/data/media-player";
import type { SupervisorMounts } from "../../../../../src/data/supervisor/mounts";
import type { SerialPortUsage } from "../../../../../src/data/usb";
import {
  WeatherEntityFeature,
  type ForecastEvent,
} from "../../../../../src/data/weather";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";

export type Scenario = (hass: MockHomeAssistant) => Promise<void> | void;

// ── Individual scenarios ───────────────────────────────────────────────────

const defaultScenario: Scenario = async (_hass) => {
  // Default: admin user, light theme — nothing extra to do, ha-test.ts sets
  // everything up already.
};

const nonAdminScenario: Scenario = async (hass) => {
  hass.updateHass({
    user: {
      ...hass.user!,
      is_admin: false,
      is_owner: false,
    },
  });
};

const darkThemeScenario: Scenario = async (hass) => {
  // Force dark mode by setting selectedTheme.dark = true.
  // _applyTheme() reads selectedTheme.dark to determine darkMode; setting
  // themes.darkMode directly gets overwritten when hassConnected() fires.
  hass.updateHass({
    selectedTheme: {
      theme: hass.selectedTheme?.theme ?? "default",
      dark: true,
    },
  });
};

const customThemeScenario: Scenario = async (hass) => {
  hass.mockTheme({
    "primary-color": "#e91e63",
    "accent-color": "#ff5722",
  });
};

const lightMoreInfoScenario: Scenario = async (hass) => {
  // Make sure we have a light entity available (sections config adds them, but
  // this ensures it exists synchronously for tests that load mid-init).
  hass.addEntities([
    {
      entity_id: "light.test_light",
      state: "on",
      attributes: {
        friendly_name: "Test Light",
        supported_features: 44,
        supported_color_modes: ["brightness", "color_temp", "xy"],
        color_mode: "brightness",
        brightness: 200,
        min_mireds: 153,
        max_mireds: 500,
      },
    },
  ]);

  // The base entity registry stub only mocks the list/get_entries commands, so
  // the more-info settings view falls back to its "no unique ID" warning. Mock
  // the single-entry lookup (config/entity_registry/get) so the settings view
  // renders the real entity-registry-settings panel.
  const registryEntry: ExtEntityRegistryEntry = {
    created_at: 0,
    modified_at: 0,
    id: "test_light",
    entity_id: "light.test_light",
    unique_id: "test_light_unique_id",
    name: null,
    icon: null,
    platform: "demo",
    config_entry_id: null,
    config_subentry_id: null,
    device_id: null,
    area_id: null,
    labels: [],
    disabled_by: null,
    hidden_by: null,
    entity_category: null,
    has_entity_name: false,
    original_name: "Test Light",
    options: null,
    categories: {},
    capabilities: {},
    aliases: [],
  };
  hass.mockWS("config/entity_registry/get", () => registryEntry);
};

const weatherMoreInfoScenario: Scenario = (hass) => {
  hass.addEntities([
    {
      entity_id: "weather.test_weather",
      state: "sunny",
      attributes: {
        friendly_name: "Test Weather",
        supported_features:
          WeatherEntityFeature.FORECAST_DAILY +
          WeatherEntityFeature.FORECAST_HOURLY,
        precipitation_unit: "mm",
        pressure_unit: "hPa",
        temperature: 20,
        temperature_unit: "°C",
        visibility_unit: "km",
        wind_speed_unit: "km/h",
      },
    },
  ]);

  hass.mockWS("weather/subscribe_forecast", (message, _hass, onChange) => {
    onChange?.({
      type: message.forecast_type,
      forecast: [
        {
          datetime: "2026-08-13T10:00:00Z",
          temperature: 20,
          condition: "sunny",
        },
        {
          datetime: "2026-08-13T11:00:00Z",
          temperature: 21,
          condition: "sunny",
        },
        {
          datetime: "2026-08-13T12:00:00Z",
          temperature: 22,
          condition: "sunny",
        },
      ],
    } satisfies ForecastEvent);
    return () => undefined;
  });
};

const quickSearchAssistScenario: Scenario = async (hass) => {
  const pipeline: AssistPipeline = {
    id: "test-pipeline",
    name: "Test Assist",
    language: "en",
    conversation_engine: "conversation.home_assistant",
    conversation_language: "en",
    stt_engine: null,
    stt_language: null,
    tts_engine: null,
    tts_language: null,
    tts_voice: null,
    wake_word_entity: null,
    wake_word_id: null,
  };

  hass.updateHass({
    config: {
      ...hass.config,
      components: [...hass.config.components, "conversation"],
    },
    enableShortcuts: true,
  });
  hass.mockWS("assist_pipeline/pipeline/list", () => ({
    pipelines: [pipeline],
    preferred_pipeline: pipeline.id,
  }));
  hass.mockWS("assist_pipeline/pipeline/get", () => pipeline);
  hass.mockWS("assist_pipeline/run", (message) => {
    window.__assistRun = message;
    return () => undefined;
  });
};

const addLaunchScreen = () => {
  const launchScreen = document.createElement("div");
  launchScreen.id = "ha-launch-screen";
  document.body.prepend(launchScreen);
};

const delayedLovelaceScenario: Scenario = (hass) => {
  addLaunchScreen();

  const config: LovelaceRawConfig = {
    views: [
      {
        title: "Home",
        cards: [{ type: "markdown", content: "Dashboard ready" }],
      },
    ],
  };
  let resolveConfig: ((config: LovelaceRawConfig) => void) | undefined;
  const configPromise = new Promise<LovelaceRawConfig>((resolve) => {
    resolveConfig = resolve;
  });

  window.resolveLovelaceConfig = () => resolveConfig?.(config);
  hass.mockWS("lovelace/config", () => configPromise);
};

const delayedGeneratedDashboardScenario: Scenario = (hass) => {
  addLaunchScreen();

  const loadFragmentTranslation = hass.loadFragmentTranslation;
  let resolveTranslation: (() => void) | undefined;
  const translationReady = new Promise<void>((resolve) => {
    resolveTranslation = resolve;
  });

  hass.loadFragmentTranslation = async (fragment) => {
    if (fragment === "lovelace") {
      await translationReady;
    }
    return loadFragmentTranslation(fragment);
  };
  window.resolveGeneratedDashboard = resolveTranslation;
};

const delayedCalendarScenario: Scenario = (hass) => {
  addLaunchScreen();

  let resolveRegistry: ((entries: EntityRegistryEntry[]) => void) | undefined;
  const registryPromise = new Promise<EntityRegistryEntry[]>((resolve) => {
    resolveRegistry = resolve;
  });

  window.resolveCalendarRegistry = () => resolveRegistry?.([]);
  hass.mockWS("config/entity_registry/list", () => registryPromise);
};

const delayedIntegrationsScenario: Scenario = (hass) => {
  addLaunchScreen();

  hass.mockWS(
    "config_entries/subscribe",
    (_msg, _currentHass, onChange?: (updates: unknown[]) => void) => {
      window.resolveConfigEntries = () => onChange?.([]);
      return () => undefined;
    }
  );
  hass.mockWS(
    "config_entries/flow/subscribe",
    (_msg, _currentHass, onChange?: (updates: unknown[]) => void) => {
      window.resolveConfigEntriesInProgress = () => onChange?.([]);
      return () => undefined;
    }
  );
};

const delayedConnectivityScenario: Scenario = (hass) => {
  addLaunchScreen();

  const { promise, resolve } = Promise.withResolvers<ConfigEntry[]>();

  window.resolveConnectivityConfigEntries = () => resolve([]);
  hass.mockWS("config_entries/get", () => promise);
};

const delayedSerialScenario: Scenario = (hass) => {
  addLaunchScreen();

  const { promise, resolve } = Promise.withResolvers<SerialPortUsage[]>();

  window.resolveSerialPorts = () => resolve([]);
  hass.mockWS("usb/list_serial_ports", () => promise);
};

const delayedStorageScenario: Scenario = (hass) => {
  addLaunchScreen();

  const hostInfo: HassioHostInfo = {
    agent_version: "1.8.0",
    chassis: "embedded",
    cpe: "cpe:2.3:o:home-assistant:haos:18.2:*:production:*:*:*:aarch64:*",
    deployment: "production",
    disk_life_time: 6,
    disk_free: 22.3,
    disk_total: 31.2,
    disk_used: 8.9,
    features: ["mount"],
    hostname: "homeassistant",
    kernel: "6.12.48-haos",
    operating_system: "Home Assistant OS 18.2",
    boot_timestamp: 1751932800000000,
    startup_time: 12.4,
  };
  let resolveHostInfo: ((info: HassioHostInfo) => void) | undefined;
  const hostInfoPromise = new Promise<HassioHostInfo>((resolve) => {
    resolveHostInfo = resolve;
  });

  window.resolveStorageHostInfo = () => resolveHostInfo?.(hostInfo);
  hass.mockWS("supervisor/api", (msg) => {
    if (msg.endpoint === "/host/info") {
      return hostInfoPromise;
    }
    if (msg.endpoint === "/host/disks/default/usage") {
      return {
        id: "root",
        label: "Total",
        total_bytes: 31200000000,
        used_bytes: 8900000000,
        children: [],
      } satisfies HostDisksUsage;
    }
    if (msg.endpoint === "/mounts") {
      return {
        default_backup_mount: null,
        mounts: [],
      } satisfies SupervisorMounts;
    }
    return Promise.reject(`${msg.method} ${msg.endpoint} is not implemented`);
  });
};

const delayedMediaBrowseScenario: Scenario = (hass) => {
  addLaunchScreen();

  const root: MediaPlayerItem = {
    title: "Media",
    media_content_id: "media-source://media_source",
    media_content_type: "app",
    media_class: "directory",
    can_play: false,
    can_expand: true,
    can_search: false,
    children: [],
  };
  let resolveBrowse: ((item: MediaPlayerItem) => void) | undefined;
  const browsePromise = new Promise<MediaPlayerItem>((resolve) => {
    resolveBrowse = resolve;
  });

  window.resolveMediaBrowse = () => resolveBrowse?.(root);
  hass.mockWS("media_source/browse_media", () => browsePromise);
};

const delayedMediaBrowseErrorScenario: Scenario = (hass) => {
  addLaunchScreen();

  let rejectBrowse:
    ((reason: { code: string; message: string }) => void) | undefined;
  const browsePromise = new Promise<MediaPlayerItem>((_resolve, reject) => {
    rejectBrowse = reject;
  });

  window.rejectMediaBrowse = () =>
    rejectBrowse?.({ code: "unknown_error", message: "Browse failed" });
  hass.mockWS("media_source/browse_media", () => browsePromise);
};

// ── Registry ──────────────────────────────────────────────────────────────

export const scenarios: Record<string, Scenario> = {
  default: defaultScenario,
  "non-admin": nonAdminScenario,
  "dark-theme": darkThemeScenario,
  "custom-theme": customThemeScenario,
  "delayed-calendar": delayedCalendarScenario,
  "delayed-connectivity": delayedConnectivityScenario,
  "delayed-generated-dashboard": delayedGeneratedDashboardScenario,
  "delayed-integrations": delayedIntegrationsScenario,
  "delayed-media-browse": delayedMediaBrowseScenario,
  "delayed-media-browse-error": delayedMediaBrowseErrorScenario,
  "delayed-serial": delayedSerialScenario,
  "delayed-storage": delayedStorageScenario,
  "light-more-info": lightMoreInfoScenario,
  "weather-more-info": weatherMoreInfoScenario,
  "quick-search-assist": quickSearchAssistScenario,
  "delayed-lovelace": delayedLovelaceScenario,
};
