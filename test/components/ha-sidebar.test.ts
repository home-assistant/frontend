import { describe, expect, it } from "vitest";
import { computeSidebarItems } from "../../src/components/ha-sidebar";
import type { HomeAssistant } from "../../src/types";

const mockPanels = {
  lovelace: {
    url_path: "lovelace",
    component_name: "lovelace",
    title: "Home",
    icon: "mdi:home",
    show_in_sidebar: true,
    default_visible: true,
    id: "lovelace",
  },
  todo: {
    url_path: "todo",
    component_name: "todo",
    title: "To-do lists",
    icon: "mdi:clipboard-list",
    show_in_sidebar: true,
    default_visible: true,
    id: "todo",
  },
} as unknown as HomeAssistant["panels"];

const mockHass = {
  panels: mockPanels,
  locale: { language: "en" },
  localize: (key: string) => {
    const map: Record<string, string> = {
      "ui.components.navigation-picker.route.automations": "Automations",
      "ui.components.navigation-picker.route.devices": "Devices",
    };
    return map[key] ?? key;
  },
} as unknown as HomeAssistant;

describe("computeSidebarItems", () => {
  it("returns only panel items when no shortcuts exist", () => {
    const items = computeSidebarItems(
      mockHass.panels,
      "lovelace",
      [],
      [],
      [],
      mockHass.locale,
      mockHass
    );
    expect(items.every((i) => i.kind === "panel")).toBe(true);
    expect(items).toHaveLength(2);
  });

  it("interleaves a shortcut at the position specified by panelOrder", () => {
    // /config/automation is the correct URL path (CONFIG_SUB_ROUTES key is "automation")
    const items = computeSidebarItems(
      mockHass.panels,
      "lovelace",
      ["lovelace", "shortcut:/config/automation", "todo"],
      [],
      ["/config/automation"],
      mockHass.locale,
      mockHass
    );
    expect(items[0]).toMatchObject({ kind: "panel" });
    expect(items[1]).toMatchObject({
      kind: "shortcut",
      path: "/config/automation",
      label: "Automations",
    });
    expect(items[2]).toMatchObject({ kind: "panel" });
  });

  it("appends shortcuts not in panelOrder after ordered panels", () => {
    const items = computeSidebarItems(
      mockHass.panels,
      "lovelace",
      [],
      [],
      ["/config/devices"],
      mockHass.locale,
      mockHass
    );
    const last = items[items.length - 1];
    expect(last).toMatchObject({ kind: "shortcut", path: "/config/devices" });
  });

  it("resolves label and iconPath from computeNavigationPathInfo", () => {
    const items = computeSidebarItems(
      mockHass.panels,
      "lovelace",
      ["shortcut:/config/automation"],
      [],
      ["/config/automation"],
      mockHass.locale,
      mockHass
    );
    const shortcut = items.find((i) => i.kind === "shortcut") as any;
    expect(shortcut.label).toBe("Automations");
    expect(shortcut.iconPath).toBeTruthy();
  });
});
