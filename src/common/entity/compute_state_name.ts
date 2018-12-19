import { HassEntity } from "home-assistant-js-websocket";
import computeObjectId from "./compute_object_id";

export default (stateObj: HassEntity): string =>
  stateObj.attributes.friendly_name ||
  computeObjectId(stateObj.entity_id).replace(/_/g, " ");
