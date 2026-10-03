import type { CommonControlsResult } from "../../../src/data/usage_prediction";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockUsagePrediction = (hass: MockHomeAssistant) => {
  // Entities that don't exist in the currently loaded demo config are
  // filtered out by the common-controls section strategy.
  hass.mockWS("usage_prediction/common_control", (): CommonControlsResult => ({
    entities: [
      "light.living_room_floor_lamp",
      "climate.living_room",
      "cover.living_room_blinds",
      "media_player.living_room_speaker",
      "light.kitchen_spotlights",
      "switch.coffee_machine",
      "light.bedside_lamp",
      "alarm_control_panel.home_alarm",
    ],
  }));
};
