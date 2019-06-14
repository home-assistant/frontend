import { HomeAssistant } from "../types";

export interface GoogleEntity {
  entity_id: string;
  traits: string[];
  might_2fa: boolean;
}

export const fetchCloudGoogleEntities = (hass: HomeAssistant) =>
  hass.callWS<GoogleEntity[]>({ type: "cloud/google_assistant/entities" });
