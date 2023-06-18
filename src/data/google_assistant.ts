import { HomeAssistant } from "../types";

export interface GoogleEntity {
  entity_id: string;
  traits: string[];
  might_2fa: boolean;
  disable_2fa?: boolean;
}

export const fetchCloudGoogleEntities = (hass: HomeAssistant) =>
  hass.callWS<GoogleEntity[]>({ type: "cloud/google_assistant/entities" });

export const fetchCloudGoogleEntity = (
  hass: HomeAssistant,
  entity_id: string
) =>
  hass.callWS<GoogleEntity>({
    type: "cloud/google_assistant/entities/get",
    entity_id,
  });

export const syncCloudGoogleEntities = (hass: HomeAssistant) =>
  hass.callApi("POST", "cloud/google_actions/sync");
