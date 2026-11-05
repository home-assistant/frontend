import { describe, expect, it } from "vitest";
import { getConfigSubpageTitle } from "../../src/data/panel";
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
