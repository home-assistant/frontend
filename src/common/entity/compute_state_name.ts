import { HassEntity } from "home-assistant-js-websocket";
import { computeObjectId } from "./compute_object_id";

export const computeStateName = (stateObj: HassEntity): string =>
  stateObj.attributes.friendly_name === undefined
    ? computeObjectId(stateObj.entity_id).replace(/_/g, " ")
    : stateObj.attributes.friendly_name || "";
