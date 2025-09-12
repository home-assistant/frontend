import type { HassEntity } from "home-assistant-js-websocket";
import { beforeEach, describe, expect, it } from "vitest";
import { getStates } from "../../../src/common/entity/get_states";
import type { HomeAssistant } from "../../../src/types";

describe("getStates", () => {
  let mockHass: HomeAssistant;

  beforeEach(() => {
    mockHass = {
      states: {
        "zone.home": {
          entity_id: "zone.home",
          state: "zoning",
          attributes: {
            friendly_name: "Home",
          },
        } as HassEntity,
        "zone.work": {
          entity_id: "zone.work",
          state: "zoning",
          attributes: {
            friendly_name: "Work",
          },
        } as HassEntity,
        "zone.office": {
          entity_id: "zone.office",
          state: "zoning",
          attributes: {
            friendly_name: "Office",
          },
        } as HassEntity,
      },
      locale: {
        language: "en",
      },
    } as any;
  });

  const createMockEntity = (
    entity_id: string,
    state = "on",
    attributes: Record<string, any> = {}
  ): HassEntity => ({
    entity_id,
    state,
    attributes,
    context: { id: "test", parent_id: null, user_id: null },
    last_changed: "2023-01-01T00:00:00Z",
    last_updated: "2023-01-01T00:00:00Z",
  });

  describe("Fixed domain states", () => {
    it("should return alarm control panel states", () => {
      const entity = createMockEntity("alarm_control_panel.test");
      const result = getStates(mockHass, entity);

      expect(result).toContain("armed_away");
      expect(result).toContain("armed_home");
      expect(result).toContain("disarmed");
      expect(result).toContain("triggered");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should return light states", () => {
      const entity = createMockEntity("light.test");
      const result = getStates(mockHass, entity);

      expect(result).toContain("on");
      expect(result).toContain("off");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should return empty array plus unavailable states for button domain", () => {
      const entity = createMockEntity("button.test");
      const result = getStates(mockHass, entity);

      expect(result).toEqual(
        expect.arrayContaining(["unavailable", "unknown"])
      );
      expect(result).not.toContain("on");
      expect(result).not.toContain("off");
    });

    it("should return weather states", () => {
      const entity = createMockEntity("weather.test");
      const result = getStates(mockHass, entity);

      expect(result).toContain("sunny");
      expect(result).toContain("cloudy");
      expect(result).toContain("rainy");
      expect(result).toContain("snowy");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });
  });

  describe("Fixed domain attribute states", () => {
    it("should return binary sensor device classes", () => {
      const entity = createMockEntity("binary_sensor.test");
      const result = getStates(mockHass, entity, "device_class");

      expect(result).toContain("door");
      expect(result).toContain("window");
      expect(result).toContain("motion");
      expect(result).toContain("battery");
      // Should not include unavailable states for attributes
      expect(result).not.toContain("unavailable");
      expect(result).not.toContain("unknown");
    });

    it("should return media player device classes", () => {
      const entity = createMockEntity("media_player.test");
      const result = getStates(mockHass, entity, "device_class");

      expect(result).toContain("tv");
      expect(result).toContain("speaker");
      expect(result).toContain("receiver");
      expect(result).not.toContain("unavailable");
    });

    it("should return sensor device classes", () => {
      const entity = createMockEntity("sensor.test");
      const result = getStates(mockHass, entity, "device_class");

      expect(result).toContain("temperature");
      expect(result).toContain("humidity");
      expect(result).toContain("battery");
      expect(result).toContain("pressure");
      expect(result).not.toContain("unavailable");
    });

    it("should return empty array for unknown attribute", () => {
      const entity = createMockEntity("light.test");
      const result = getStates(mockHass, entity, "unknown_attribute");

      expect(result).toEqual([]);
    });
  });

  describe("Dynamic climate states", () => {
    it("should return climate hvac_modes for no attribute", () => {
      const entity = createMockEntity("climate.test", "off", {
        hvac_modes: ["heat", "cool", "auto", "off"],
      });
      const result = getStates(mockHass, entity);

      expect(result).toContain("heat");
      expect(result).toContain("cool");
      expect(result).toContain("auto");
      expect(result).toContain("off");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should return climate fan_modes for fan_mode attribute", () => {
      const entity = createMockEntity("climate.test", "heat", {
        fan_modes: ["low", "medium", "high", "auto"],
      });
      const result = getStates(mockHass, entity, "fan_mode");

      expect(result).toContain("low");
      expect(result).toContain("medium");
      expect(result).toContain("high");
      expect(result).toContain("auto");
      expect(result).not.toContain("unavailable");
    });

    it("should return preset_modes for preset_mode attribute", () => {
      const entity = createMockEntity("climate.test", "heat", {
        preset_modes: ["eco", "comfort", "sleep"],
      });
      const result = getStates(mockHass, entity, "preset_mode");

      expect(result).toContain("eco");
      expect(result).toContain("comfort");
      expect(result).toContain("sleep");
    });

    it("should return swing_modes for swing_mode attribute", () => {
      const entity = createMockEntity("climate.test", "cool", {
        swing_modes: ["on", "off", "vertical", "horizontal"],
      });
      const result = getStates(mockHass, entity, "swing_mode");

      expect(result).toContain("on");
      expect(result).toContain("off");
      expect(result).toContain("vertical");
      expect(result).toContain("horizontal");
    });
  });

  describe("Device tracker and person zones", () => {
    it("should return zones for device_tracker without attributes", () => {
      const entity = createMockEntity("device_tracker.test");
      const result = getStates(mockHass, entity);

      expect(result).toContain("home");
      expect(result).toContain("not_home");
      expect(result).toContain("Work");
      expect(result).toContain("Office");
      expect(result).not.toContain("Home"); // zone.home is excluded
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should return zones for person without attributes", () => {
      const entity = createMockEntity("person.test");
      const result = getStates(mockHass, entity);

      expect(result).toContain("home");
      expect(result).toContain("not_home");
      expect(result).toContain("Work");
      expect(result).toContain("Office");
      expect(result).not.toContain("Home"); // zone.home is excluded
    });

    it("should not return zones for device_tracker with attributes", () => {
      const entity = createMockEntity("device_tracker.test");
      const result = getStates(mockHass, entity, "source_type");

      expect(result).toContain("bluetooth");
      expect(result).toContain("router");
      expect(result).toContain("gps");
      expect(result).not.toContain("Work");
      expect(result).not.toContain("Office");
    });
  });

  describe("Select and input_select options", () => {
    it("should return options for input_select", () => {
      const entity = createMockEntity("input_select.test", "option1", {
        options: ["option1", "option2", "option3"],
      });
      const result = getStates(mockHass, entity);

      expect(result).toContain("option1");
      expect(result).toContain("option2");
      expect(result).toContain("option3");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should return options for select", () => {
      const entity = createMockEntity("select.test", "mode1", {
        options: ["mode1", "mode2", "mode3"],
      });
      const result = getStates(mockHass, entity);

      expect(result).toContain("mode1");
      expect(result).toContain("mode2");
      expect(result).toContain("mode3");
    });
  });

  describe("Light effects and color modes", () => {
    it("should return effect list for light effect attribute", () => {
      const entity = createMockEntity("light.test", "on", {
        effect_list: ["rainbow", "colorloop", "pulse"],
      });
      const result = getStates(mockHass, entity, "effect");

      expect(result).toContain("rainbow");
      expect(result).toContain("colorloop");
      expect(result).toContain("pulse");
      expect(result).not.toContain("unavailable");
    });

    it("should return color modes for light color_mode attribute", () => {
      const entity = createMockEntity("light.test", "on", {
        supported_color_modes: ["rgb", "xy", "hs"],
      });
      const result = getStates(mockHass, entity, "color_mode");

      expect(result).toContain("rgb");
      expect(result).toContain("xy");
      expect(result).toContain("hs");
    });

    it("should return empty for light effect without effect_list", () => {
      const entity = createMockEntity("light.test", "on", {});
      const result = getStates(mockHass, entity, "effect");

      expect(result).toEqual([]);
    });
  });

  describe("Media player attributes", () => {
    it("should return sound modes for sound_mode attribute", () => {
      const entity = createMockEntity("media_player.test", "playing", {
        sound_mode_list: ["stereo", "surround", "music"],
      });
      const result = getStates(mockHass, entity, "sound_mode");

      expect(result).toContain("stereo");
      expect(result).toContain("surround");
      expect(result).toContain("music");
    });

    it("should return source list for source attribute", () => {
      const entity = createMockEntity("media_player.test", "playing", {
        source_list: ["spotify", "radio", "cd"],
      });
      const result = getStates(mockHass, entity, "source");

      expect(result).toContain("spotify");
      expect(result).toContain("radio");
      expect(result).toContain("cd");
    });
  });

  describe("Sensor enum options", () => {
    it("should return options for enum sensor", () => {
      const entity = createMockEntity("sensor.test", "low", {
        device_class: "enum",
        options: ["low", "medium", "high"],
      });
      const result = getStates(mockHass, entity);

      expect(result).toContain("low");
      expect(result).toContain("medium");
      expect(result).toContain("high");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should not return options for non-enum sensor", () => {
      const entity = createMockEntity("sensor.test", "25", {
        device_class: "temperature",
        options: ["low", "medium", "high"], // This shouldn't be used
      });
      const result = getStates(mockHass, entity);

      expect(result).not.toContain("low");
      expect(result).not.toContain("medium");
      expect(result).not.toContain("high");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });
  });

  describe("Other domain specific attributes", () => {
    it("should return event types for event attribute", () => {
      const entity = createMockEntity("event.test", "triggered", {
        event_types: ["button_press", "motion", "door_open"],
      });
      const result = getStates(mockHass, entity, "event_type");

      expect(result).toContain("button_press");
      expect(result).toContain("motion");
      expect(result).toContain("door_open");
    });

    it("should return preset modes for fan", () => {
      const entity = createMockEntity("fan.test", "on", {
        preset_modes: ["breeze", "sleep", "auto"],
      });
      const result = getStates(mockHass, entity, "preset_mode");

      expect(result).toContain("breeze");
      expect(result).toContain("sleep");
      expect(result).toContain("auto");
    });

    it("should return available modes for humidifier", () => {
      const entity = createMockEntity("humidifier.test", "on", {
        available_modes: ["normal", "eco", "boost"],
      });
      const result = getStates(mockHass, entity, "mode");

      expect(result).toContain("normal");
      expect(result).toContain("eco");
      expect(result).toContain("boost");
    });

    it("should return activity list for remote", () => {
      const entity = createMockEntity("remote.test", "on", {
        activity_list: ["watch_tv", "listen_music", "gaming"],
      });
      const result = getStates(mockHass, entity, "current_activity");

      expect(result).toContain("watch_tv");
      expect(result).toContain("listen_music");
      expect(result).toContain("gaming");
    });

    it("should return fan speed list for vacuum", () => {
      const entity = createMockEntity("vacuum.test", "cleaning", {
        fan_speed_list: ["quiet", "standard", "high"],
      });
      const result = getStates(mockHass, entity, "fan_speed");

      expect(result).toContain("quiet");
      expect(result).toContain("standard");
      expect(result).toContain("high");
    });

    it("should return operation list for water_heater", () => {
      const entity = createMockEntity("water_heater.test", "eco", {
        operation_list: ["eco", "electric", "gas"],
      });
      const result = getStates(mockHass, entity);

      expect(result).toContain("eco");
      expect(result).toContain("electric");
      expect(result).toContain("gas");
    });

    it("should return operation list for water_heater operation_mode attribute", () => {
      const entity = createMockEntity("water_heater.test", "eco", {
        operation_list: ["eco", "electric", "gas"],
      });
      const result = getStates(mockHass, entity, "operation_mode");

      expect(result).toContain("eco");
      expect(result).toContain("electric");
      expect(result).toContain("gas");
    });
  });

  describe("Edge cases and boundary conditions", () => {
    it("should handle missing attributes gracefully", () => {
      const entity = createMockEntity("light.test", "off", {});
      const result = getStates(mockHass, entity);

      // Should still return fixed states and unavailable states
      expect(result).toContain("on");
      expect(result).toContain("off");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should handle undefined attribute lists gracefully", () => {
      const entity = createMockEntity("light.test", "on", {
        effect_list: undefined,
      });
      const result = getStates(mockHass, entity, "effect");

      expect(result).toEqual([]);
    });

    it("should not include unavailable states when attribute is specified", () => {
      const entity = createMockEntity("binary_sensor.test");
      const result = getStates(mockHass, entity, "device_class");

      expect(result).not.toContain("unavailable");
      expect(result).not.toContain("unknown");
    });

    it("should deduplicate states using Set", () => {
      const entity = createMockEntity("light.test", "on", {
        // Simulate case where fixed and dynamic states might overlap
      });
      const result = getStates(mockHass, entity);

      // Each state should only appear once
      const uniqueStates = [...new Set(result)];
      expect(result.length).toBe(uniqueStates.length);
    });

    it("should handle empty hass.states object", () => {
      const emptyHass = {
        ...mockHass,
        states: {},
      };
      const entity = createMockEntity("device_tracker.test");
      const result = getStates(emptyHass, entity);

      // Should still return fixed states
      expect(result).toContain("home");
      expect(result).toContain("not_home");
      expect(result).toContain("unavailable");
      expect(result).toContain("unknown");
    });

    it("should handle zones without friendly_name", () => {
      const hassWithoutFriendlyName = {
        ...mockHass,
        states: {
          ...mockHass.states,
          "zone.no_name": {
            entity_id: "zone.no_name",
            state: "zoning",
            attributes: {}, // No friendly_name
          } as HassEntity,
        },
      };
      const entity = createMockEntity("device_tracker.test");
      const result = getStates(hassWithoutFriendlyName, entity);

      // Should not include zones without friendly_name
      expect(result).toContain("Work");
      expect(result).toContain("Office");
      expect(result).not.toContain("no_name");
    });
  });
});
