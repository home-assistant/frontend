import { HassEntity } from "home-assistant-js-websocket";
import { computeObjectId } from "./compute_object_id";

export const computeStateNameFromEntityAttributes = (
  entityId: string,
  attributes: { [key: string]: any }
): string =>
  attributes.friendly_name === undefined
    ? computeObjectId(entityId).replace(/_/g, " ")
    : (attributes.friendly_name ?? "").toString();

export const computeStateName = (stateObj: HassEntity): string =>
  computeStateNameFromEntityAttributes(stateObj.entity_id, stateObj.attributes);
