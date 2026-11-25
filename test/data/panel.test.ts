import { describe, expect, it } from "vitest";
import {
  getConfigSubpageTitle,
  getSelectedPanelUrlPath,
} from "../../src/data/panel";
import type { PageNavigation } from "../../src/layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../src/types";

const translations: Record<string, string> = {
  "ui.panel.config.dashboard.devices.main": "Devices & services",
  "ui.panel.config.dashboard.system.main": "System",
  "ui.panel.config.dashboard.matter.main": "Matter",
  "ui.panel.config.integrations.caption": "Integrations",
  "ui.panel.config.logs.caption": "Logs",
  "ui.panel.config.backup.caption": "Backups",
};

const hass = {
  localize: (key: string) => translations[key] ?? "",
} as unknown as HomeAssistant;

// Mirrors how config-sections.ts mixes short and full translation keys.
const configSections: Record<string, PageNavigation[]> = {
  dashboard: [
    { path: "/config/integrations", translationKey: "devices" },
  ] as PageNavigation[],
  dashboard_3: [
    { path: "/config/system", translationKey: "system" },
  ] as PageNavigation[],
  connectivity: [
    { path: "/config/matter", translationKey: "matter" },
  ] as PageNavigation[],
  devices: [
    {
      path: "/config/integrations",
      translationKey: "ui.panel.config.integrations.caption",
    },
  ] as PageNavigation[],
  backup: [
    {
      path: "/config/backup",
      translationKey: "ui.panel.config.backup.caption",
    },
  ] as PageNavigation[],
  general: [
    { path: "/config/logs", translationKey: "logs" },
    { path: "/config/backup", translationKey: "backup" },
  ] as PageNavigation[],
};

describe("getConfigSubpageTitle", () => {
  it("prefers a full translation key over a dashboard entry", () => {
    expect(
      getConfigSubpageTitle(
        hass,
        "/config/integrations/dashboard",
        configSections
      )
    ).toBe("Integrations");
  });

  it("expands short keys of the general section", () => {
    expect(getConfigSubpageTitle(hass, "/config/logs", configSections)).toBe(
      "Logs"
    );
  });

  it("expands short keys of the dashboard sections", () => {
    expect(getConfigSubpageTitle(hass, "/config/system", configSections)).toBe(
      "System"
    );
    expect(getConfigSubpageTitle(hass, "/config/matter", configSections)).toBe(
      "Matter"
    );
  });

  it("keeps a full key when the page also has a short one", () => {
    expect(getConfigSubpageTitle(hass, "/config/backup", configSections)).toBe(
      "Backups"
    );
  });

  it("falls back to the panel title for unknown pages", () => {
    expect(
      getConfigSubpageTitle(hass, "/config/unknown", configSections)
    ).toBeUndefined();
  });
});

describe("getSelectedPanelUrlPath", () => {
  const urlPaths = ["lovelace", "history", "config/logs", "config/logs/raw"];

  it("falls back to the first path segment", () => {
    expect(getSelectedPanelUrlPath(urlPaths, "/config/automation")).toBe(
      "config"
    );
    expect(getSelectedPanelUrlPath(urlPaths, "/profile/general")).toBe(
      "profile"
    );
  });

  it("selects a panel whose url_path has several segments", () => {
    expect(getSelectedPanelUrlPath(urlPaths, "/config/logs")).toBe(
      "config/logs"
    );
    expect(getSelectedPanelUrlPath(urlPaths, "/config/logs/details")).toBe(
      "config/logs"
    );
  });

  it("prefers the most specific url_path", () => {
    expect(getSelectedPanelUrlPath(urlPaths, "/config/logs/raw")).toBe(
      "config/logs/raw"
    );
  });

  it("only matches whole segments", () => {
    expect(getSelectedPanelUrlPath(urlPaths, "/config/logsfoo")).toBe("config");
  });

  it("keeps matching single segment panels on their subpaths", () => {
    expect(getSelectedPanelUrlPath(urlPaths, "/lovelace/0")).toBe("lovelace");
  });

  it("returns an empty url_path for the root path", () => {
    expect(getSelectedPanelUrlPath(urlPaths, "/")).toBe("");
  });
});
