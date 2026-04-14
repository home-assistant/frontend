import { mdiDevices, mdiLink, mdiTextureBox } from "@mdi/js";
import { describe, expect, it } from "vitest";
import { computeNavigationPathInfo } from "../../src/data/compute-navigation-path-info";
import type { HomeAssistant } from "../../src/types";
import type { LovelaceConfig } from "../../src/data/lovelace/config/types";

const createHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    panels: {},
    areas: {},
    devices: {},
    localize: () => "",
    ...overrides,
  }) as unknown as HomeAssistant;

describe("computeNavigationPathInfo", () => {
  describe("panel paths", () => {
    it("resolves a panel with icon", () => {
      const hass = createHass({
        panels: {
          "my-panel": {
            url_path: "my-panel",
            title: "My Panel",
            icon: "mdi:star",
            component_name: "custom",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(hass, "/my-panel");
      expect(result.label).toBe("My Panel");
      expect(result.icon).toBe("mdi:star");
      expect(result.iconPath).toBe(mdiLink);
    });

    it("falls back to url path for unknown panel", () => {
      const hass = createHass();
      const result = computeNavigationPathInfo(hass, "/unknown");
      expect(result.label).toBe("unknown");
      expect(result.icon).toBeUndefined();
      expect(result.iconPath).toBe(mdiLink);
    });
  });

  describe("area paths", () => {
    it("resolves /config/areas/area/{areaId}", () => {
      const hass = createHass({
        areas: {
          living_room: {
            area_id: "living_room",
            name: "Living Room",
            icon: "mdi:sofa",
          },
        } as unknown as HomeAssistant["areas"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/config/areas/area/living_room"
      );
      expect(result.label).toBe("Living Room");
      expect(result.icon).toBe("mdi:sofa");
      expect(result.iconPath).toBe(mdiTextureBox);
    });

    it("resolves /home/areas-{areaId}", () => {
      const hass = createHass({
        areas: {
          kitchen: {
            area_id: "kitchen",
            name: "Kitchen",
            icon: null,
          },
        } as unknown as HomeAssistant["areas"],
      });

      const result = computeNavigationPathInfo(hass, "/home/areas-kitchen");
      expect(result.label).toBe("Kitchen");
      expect(result.icon).toBeUndefined();
      expect(result.iconPath).toBe(mdiTextureBox);
    });

    it("falls back to area id for unknown area", () => {
      const hass = createHass();
      const result = computeNavigationPathInfo(
        hass,
        "/config/areas/area/unknown_area"
      );
      expect(result.label).toBe("unknown_area");
      expect(result.iconPath).toBe(mdiTextureBox);
    });
  });

  describe("device paths", () => {
    it("resolves /config/devices/device/{deviceId}", () => {
      const hass = createHass({
        devices: {
          abc123: {
            id: "abc123",
            name: "Smart Light",
            name_by_user: null,
          },
        } as unknown as HomeAssistant["devices"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/config/devices/device/abc123"
      );
      expect(result.label).toBe("Smart Light");
      expect(result.iconPath).toBe(mdiDevices);
    });

    it("prefers user-defined device name", () => {
      const hass = createHass({
        devices: {
          abc123: {
            id: "abc123",
            name: "Smart Light",
            name_by_user: "My Light",
          },
        } as unknown as HomeAssistant["devices"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/config/devices/device/abc123"
      );
      expect(result.label).toBe("My Light");
    });

    it("falls back to device id for unknown device", () => {
      const hass = createHass();
      const result = computeNavigationPathInfo(
        hass,
        "/config/devices/device/unknown_device"
      );
      expect(result.label).toBe("unknown_device");
      expect(result.iconPath).toBe(mdiDevices);
    });
  });

  describe("lovelace view paths", () => {
    const lovelaceConfig: LovelaceConfig = {
      views: [
        { title: "Overview", path: "overview", icon: "mdi:home" },
        { title: "Lights", path: "lights" },
        { path: "my-view" },
        {},
      ],
    };

    it("resolves view with title and icon", () => {
      const hass = createHass({
        panels: {
          lovelace: {
            url_path: "lovelace",
            title: "Dashboard",
            component_name: "lovelace",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/lovelace/overview",
        lovelaceConfig
      );
      expect(result.label).toBe("Overview");
      expect(result.icon).toBe("mdi:home");
    });

    it("resolves view without icon using default", () => {
      const hass = createHass({
        panels: {
          lovelace: {
            url_path: "lovelace",
            title: "Dashboard",
            component_name: "lovelace",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/lovelace/lights",
        lovelaceConfig
      );
      expect(result.label).toBe("Lights");
      expect(result.icon).toBe("mdi:view-compact");
    });

    it("uses titleCase of path when view has no title", () => {
      const hass = createHass({
        panels: {
          lovelace: {
            url_path: "lovelace",
            title: "Dashboard",
            component_name: "lovelace",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/lovelace/my-view",
        lovelaceConfig
      );
      expect(result.label).toBe("My-view");
    });

    it("uses index as name when view has no title or path", () => {
      const hass = createHass({
        panels: {
          lovelace: {
            url_path: "lovelace",
            title: "Dashboard",
            component_name: "lovelace",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/lovelace/3",
        lovelaceConfig
      );
      expect(result.label).toBe("3");
    });

    it("falls back to panel info when view not found", () => {
      const hass = createHass({
        panels: {
          lovelace: {
            url_path: "lovelace",
            title: "Dashboard",
            component_name: "lovelace",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(
        hass,
        "/lovelace/nonexistent",
        lovelaceConfig
      );
      expect(result.label).toBe("Dashboard");
    });

    it("falls back to panel info when no lovelace config provided", () => {
      const hass = createHass({
        panels: {
          lovelace: {
            url_path: "lovelace",
            title: "Dashboard",
            component_name: "lovelace",
          },
        } as unknown as HomeAssistant["panels"],
      });

      const result = computeNavigationPathInfo(hass, "/lovelace/overview");
      expect(result.label).toBe("Dashboard");
    });
  });
});
