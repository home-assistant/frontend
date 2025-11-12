import { describe, expect, test } from "vitest";
import { DEFAULT_PANEL, getDefaultPanel } from "../../src/data/panel";
import type { HomeAssistant, PanelInfo } from "../../src/types";

describe("panel", () => {
  const mockLovelacePanel: PanelInfo = {
    component_name: "lovelace",
    config: {},
    icon: "mdi:view-dashboard",
    title: "Overview",
    url_path: "lovelace",
  };

  const mockCustomPanel: PanelInfo = {
    component_name: "custom",
    config: {},
    icon: "mdi:custom",
    title: "Custom Dashboard",
    url_path: "custom-dashboard",
  };

  const createMockHass = (
    defaultBrowserPanel: string,
    userDefaultPanel?: string
  ): HomeAssistant =>
    ({
      panels: {
        lovelace: mockLovelacePanel,
        "custom-dashboard": mockCustomPanel,
      },
      defaultBrowserPanel,
      userData: userDefaultPanel !== undefined ? { defaultPanel: userDefaultPanel } : undefined,
    }) as unknown as HomeAssistant;

  describe("getDefaultPanel", () => {
    test("returns default panel when no overrides are set", () => {
      const hass = createMockHass(DEFAULT_PANEL);
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockLovelacePanel);
    });

    test("returns browser override panel when set to non-default", () => {
      const hass = createMockHass("custom-dashboard");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockCustomPanel);
    });

    test("returns user default panel when browser is default", () => {
      const hass = createMockHass(DEFAULT_PANEL, "custom-dashboard");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockCustomPanel);
    });

    test("browser override takes precedence over user default", () => {
      const hass = createMockHass("custom-dashboard", "lovelace");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockCustomPanel);
    });

    test("falls back to default panel when browser override doesn't exist", () => {
      const hass = createMockHass("non-existent-panel");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockLovelacePanel);
    });

    test("falls back to default panel when user default doesn't exist", () => {
      const hass = createMockHass(DEFAULT_PANEL, "non-existent-panel");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockLovelacePanel);
    });

    test("handles undefined userData", () => {
      const hass = {
        panels: {
          lovelace: mockLovelacePanel,
        },
        defaultBrowserPanel: DEFAULT_PANEL,
        userData: undefined,
      } as unknown as HomeAssistant;
      
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockLovelacePanel);
    });

    test("handles null userData", () => {
      const hass = {
        panels: {
          lovelace: mockLovelacePanel,
        },
        defaultBrowserPanel: DEFAULT_PANEL,
        userData: null,
      } as unknown as HomeAssistant;
      
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockLovelacePanel);
    });

    test("handles empty string user default", () => {
      const hass = createMockHass(DEFAULT_PANEL, "");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockLovelacePanel);
    });

    test("returns user default when browser is default and user default exists", () => {
      const hass = createMockHass(DEFAULT_PANEL, "custom-dashboard");
      const result = getDefaultPanel(hass);
      expect(result).toBe(mockCustomPanel);
    });
  });
});
