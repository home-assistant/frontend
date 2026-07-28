import type { ExtEntityRegistryEntry } from "../../../../../src/data/entity/entity_registry";
import type { AssistPipeline } from "../../../../../src/data/assist_pipeline";
import type { LovelaceRawConfig } from "../../../../../src/data/lovelace/config/types";
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

// ── Registry ──────────────────────────────────────────────────────────────

export const scenarios: Record<string, Scenario> = {
  default: defaultScenario,
  "non-admin": nonAdminScenario,
  "dark-theme": darkThemeScenario,
  "custom-theme": customThemeScenario,
  "light-more-info": lightMoreInfoScenario,
  "quick-search-assist": quickSearchAssistScenario,
  "delayed-lovelace": delayedLovelaceScenario,
};
