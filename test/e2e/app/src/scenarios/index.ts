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
};

// ── Registry ──────────────────────────────────────────────────────────────

export const scenarios: Record<string, Scenario> = {
  default: defaultScenario,
  "non-admin": nonAdminScenario,
  "dark-theme": darkThemeScenario,
  "custom-theme": customThemeScenario,
  "light-more-info": lightMoreInfoScenario,
};
