import { HomeAssistant } from "../types";
import computeObjectId from "../common/entity/compute_object_id";

export interface EventAction {
  event: string;
  event_data?: { [key: string]: any };
  event_data_template?: { [key: string]: any };
}

export interface DeviceAction {
  device_id: string;
  domain: string;
  entity_id: string;
}

export const triggerScript = (
  hass: HomeAssistant,
  entityId: string,
  variables?: {}
) => hass.callService("script", computeObjectId(entityId), variables);

export const deleteScript = (hass: HomeAssistant, objectId: string) =>
  hass.callApi("DELETE", `config/script/config/${objectId}`);
