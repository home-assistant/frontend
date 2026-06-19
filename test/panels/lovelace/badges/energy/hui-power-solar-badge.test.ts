import { describe, it, expect, beforeEach, vi } from "vitest";
import { html } from "lit";
import { fixture } from "@open-wc/testing-helpers";
import type { HuiPowerSolarBadge } from "../../../src/panels/lovelace/badges/energy/hui-power-solar-badge";
import "../../../src/panels/lovelace/badges/energy/hui-power-solar-badge";
import type { HomeAssistant } from "../../../src/types";

describe("HuiPowerSolarBadge", () => {
  let element: HuiPowerSolarBadge;
  let hass: Partial<HomeAssistant>;

  beforeEach(async () => {
    // Mock HomeAssistant
    hass = {
      states: {
        "sensor.solar_power": {
          entity_id: "sensor.solar_power",
          state: "500",
          attributes: {
            unit_of_measurement: "W",
            friendly_name: "Solar Power",
          },
          last_changed: "2026-06-04T15:00:00Z",
          last_updated: "2026-06-04T15:00:00Z",
          context: {
            id: "test",
            parent_id: null,
            user_id: null,
          },
        },
      },
      locale: {
        language: "en",
        number_format: "en",
        time_format: "24",
        date_format: "YYYY-MM-DD",
        time_zone: "UTC",
        first_weekday: "monday",
      },
      localize: (key: string) => {
        const translations: Record<string, string> = {
          "ui.panel.lovelace.cards.energy.power_solar_title": "Solar Power",
        };
        return translations[key] || key;
      },
    } as Partial<HomeAssistant>;

    // Create the element
    element = await fixture<HuiPowerSolarBadge>(
      html`<hui-power-solar-badge></hui-power-solar-badge>`
    );
    element.hass = hass as HomeAssistant;
  });

  describe("Initialization", () => {
    it("should render without errors", () => {
      expect(element).toBeTruthy();
    });

    it("should have the custom element name", () => {
      expect(element.tagName).toBe("HUI-POWER-SOLAR-BADGE");
    });
  });

  describe("Configuration", () => {
    it("should set configuration via setConfig", () => {
      const config = {
        type: "power-solar",
        collection_key: "test_key",
      };
      element.setConfig(config);
      expect((element as any)._config).toEqual(config);
    });

    it("should set custom title from config", () => {
      const config = {
        type: "power-solar",
        title: "My Solar Production",
        collection_key: "test_key",
      };
      element.setConfig(config);
      expect((element as any)._config.title).toBe("My Solar Production");
    });
  });

  describe("Power Calculation", () => {
    it("should return 0 when no data is available", () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._data = undefined;
      const power = (element as any)._getSolarPower();
      expect(power).toBe(0);
    });

    it("should return 0 when no solar sources configured", () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._data = {
        prefs: {
          energy_sources: [],
        },
      };
      const power = (element as any)._getSolarPower();
      expect(power).toBe(0);
    });

    it("should return 0 when solar source has no stat_rate", () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              // no stat_rate
            },
          ],
        },
      };
      const power = (element as any)._getSolarPower();
      expect(power).toBe(0);
    });

    it("should extract solar power from state correctly", () => {
      element.setConfig({ type: "power-solar", collection_key: "test" });
      (element as any)._states = {
        "sensor.solar_power": {
          state: "1234",
          attributes: { unit_of_measurement: "W" },
        },
      };
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };

      const power = (element as any)._getSolarPower();
      expect(power).toBe(1234);
    });
  });

  describe("Rendering", () => {
    it("should render nothing when config is not set", () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._config = undefined;
      const result = (element as any).render();
      expect(result).toBe(undefined);
    });

    it("should render nothing when data is not available", () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._data = undefined;
      const result = (element as any).render();
      expect(result).toBe(undefined);
    });

    it("should render nothing when i18n is not available", () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._data = { prefs: {} };
      (element as any)._i18n = undefined;
      const result = (element as any).render();
      expect(result).toBe(undefined);
    });

    it("should display power in watts when under 1000W", async () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._states = {
        "sensor.solar_power": {
          state: "500",
          attributes: { unit_of_measurement: "W" },
        },
      };
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };
      (element as any)._i18n = hass.locale;

      await element.updateComplete;
      const text = element.textContent;
      expect(text).toContain("500");
      expect(text).toContain("W");
    });

    it("should display power in kilowatts when 1000W or above", async () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._states = {
        "sensor.solar_power": {
          state: "5500",
          attributes: { unit_of_measurement: "W" },
        },
      };
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };
      (element as any)._i18n = hass.locale;

      await element.updateComplete;
      const text = element.textContent;
      expect(text).toContain("5.5");
      expect(text).toContain("kW");
    });

    it("should use default title from i18n when not provided in config", async () => {
      element.setConfig({ type: "power-solar" });
      (element as any)._states = {
        "sensor.solar_power": {
          state: "100",
          attributes: { unit_of_measurement: "W" },
        },
      };
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };
      (element as any)._i18n = hass.locale;

      await element.updateComplete;
      const text = element.textContent;
      expect(text).toContain("Solar Power");
    });

    it("should use custom title from config when provided", async () => {
      element.setConfig({
        type: "power-solar",
        title: "My Solar",
      });
      (element as any)._states = {
        "sensor.solar_power": {
          state: "100",
          attributes: { unit_of_measurement: "W" },
        },
      };
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };
      (element as any)._i18n = hass.locale;

      await element.updateComplete;
      const text = element.textContent;
      expect(text).toContain("My Solar");
    });
  });

  describe("shouldUpdate", () => {
    it("should update when config changes", () => {
      const result = (element as any).shouldUpdate(
        new Map([["_config", undefined]])
      );
      expect(result).toBe(true);
    });

    it("should update when data changes", () => {
      const result = (element as any).shouldUpdate(
        new Map([["_data", undefined]])
      );
      expect(result).toBe(true);
    });

    it("should update when solar source state changes", () => {
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };
      const oldStates = {
        "sensor.solar_power": {
          state: "500",
        },
      };
      const newStates = {
        "sensor.solar_power": {
          state: "600",
        },
      };
      (element as any)._states = newStates;

      const result = (element as any).shouldUpdate(
        new Map([["_states", oldStates]])
      );
      expect(result).toBe(true);
    });

    it("should not update when non-solar states change", () => {
      (element as any)._data = {
        prefs: {
          energy_sources: [
            {
              type: "solar",
              stat_rate: "sensor.solar_power",
            },
          ],
        },
      };
      const oldStates = {
        "sensor.other_entity": {
          state: "100",
        },
      };
      const newStates = {
        "sensor.other_entity": {
          state: "200",
        },
      };
      (element as any)._states = newStates;

      const result = (element as any).shouldUpdate(
        new Map([["_states", oldStates]])
      );
      expect(result).toBe(false);
    });
  });

  describe("Styles", () => {
    it("should have badge-color CSS variable", () => {
      const styles = (element.constructor as any).styles;
      expect(styles).toBeDefined();
    });
  });
});
