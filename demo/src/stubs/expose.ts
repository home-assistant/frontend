import type { ExposeEntitySettings } from "../../../src/data/expose";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const exposedEntities: Record<string, ExposeEntitySettings> = {
  "light.floor_lamp": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": true,
  },
  "light.living_room_spotlights": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": false,
  },
  "light.bar_lamp": {
    conversation: true,
    "cloud.alexa": false,
    "cloud.google_assistant": true,
  },
  "light.kitchen_spotlights": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": true,
  },
  "light.outdoor_light": {
    conversation: true,
    "cloud.alexa": true,
    "cloud.google_assistant": true,
  },
};

export const mockExpose = (hass: MockHomeAssistant) => {
  hass.mockWS("homeassistant/expose_entity/list", () => ({
    exposed_entities: structuredClone(exposedEntities),
  }));
  hass.mockWS(
    "homeassistant/expose_new_entities/get",
    (msg: { assistant: string }) => ({
      expose_new: msg.assistant !== "cloud.google_assistant",
    })
  );
  hass.mockWS(
    "homeassistant/expose_entity",
    (msg: {
      assistants: (keyof ExposeEntitySettings)[];
      entity_ids: string[];
      should_expose: boolean;
    }) => {
      const changedEntityIds = msg.entity_ids.filter((entityId) => {
        const settings = (exposedEntities[entityId] ??= {});
        let changed = false;
        for (const assistant of msg.assistants) {
          if (Boolean(settings[assistant]) !== msg.should_expose) {
            changed = true;
          }
          settings[assistant] = msg.should_expose;
        }
        return changed;
      });
      return { changed_entity_ids: changedEntityIds };
    }
  );
  hass.mockWS("homeassistant/expose_new_entities/set", () => null);
};
