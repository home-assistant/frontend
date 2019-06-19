import { HomeAssistant } from "../types";

export interface AlexaEntity {
  entity_id: string;
  display_categories: string[];
  interfaces: string[];
}

export const fetchCloudAlexaEntities = (hass: HomeAssistant) =>
  hass.callWS<AlexaEntity[]>({ type: "cloud/alexa/entities" });

export const syncCloudAlexaEntities = (hass: HomeAssistant) =>
  hass.callWS({ type: "cloud/alexa/sync" });
