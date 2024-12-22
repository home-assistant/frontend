import { HomeAssistant } from "../types";

export const voiceAssistants = {
  conversation: { domain: "assist_pipeline", name: "Assist" },
  "cloud.alexa": {
    domain: "alexa",
    name: "Amazon Alexa",
  },
  "cloud.google_assistant": {
    domain: "google_assistant",
    name: "Google Assistant",
  },
} as const;

export interface ExposeEntitySettings {
  conversation?: boolean;
  "cloud.alexa"?: boolean;
  "cloud.google_assistant"?: boolean;
}

export const setExposeNewEntities = (
  hass: HomeAssistant,
  assistant: string,
  expose_new: boolean
) =>
  hass.callWS({
    type: "homeassistant/expose_new_entities/set",
    assistant,
    expose_new,
  });

export const getExposeNewEntities = (hass: HomeAssistant, assistant: string) =>
  hass.callWS<{ expose_new: boolean }>({
    type: "homeassistant/expose_new_entities/get",
    assistant,
  });

export const exposeEntities = (
  hass: HomeAssistant,
  assistants: string[],
  entity_ids: string[],
  should_expose: boolean
) =>
  hass.callWS({
    type: "homeassistant/expose_entity",
    assistants,
    entity_ids,
    should_expose,
  });

export const listExposedEntities = (hass: HomeAssistant) =>
  hass.callWS<{ exposed_entities: Record<string, ExposeEntitySettings> }>({
    type: "homeassistant/expose_entity/list",
  });
