import { HomeAssistant } from "../types";
import { computeObjectId } from "../common/entity/compute_object_id";

export const triggerScript = (
  hass: HomeAssistant,
  entityId: string,
  variables?: {}
) => hass.callService("script", computeObjectId(entityId), variables);

export const deleteScript = (hass: HomeAssistant, objectId: string) =>
  hass.callApi("DELETE", `config/script/config/${objectId}`);
