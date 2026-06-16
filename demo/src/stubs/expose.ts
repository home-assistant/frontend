import type { ExposeEntitySettings } from "../../../src/data/expose";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const exposedEntities: Record<string, ExposeEntitySettings> = {
  "light.bed_light": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": true,
  },
  "light.ceiling_lights": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": false,
  },
  "switch.decorative_lights": {
    conversation: true,
    "cloud.alexa": false,
    "cloud.google_assistant": true,
  },
  "climate.ecobee": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": true,
  },
};

export const mockExpose = (hass: MockHomeAssistant) => {
  hass.mockWS("homeassistant/expose_entity/list", () => ({
    exposed_entities: exposedEntities,
  }));
  hass.mockWS(
    "homeassistant/expose_new_entities/get",
    (msg: { assistant: string }) => ({
      expose_new: msg.assistant !== "cloud.google_assistant",
    })
  );
  hass.mockWS("homeassistant/expose_entity", () => null);
  hass.mockWS("homeassistant/expose_new_entities/set", () => null);
};
