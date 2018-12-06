import { HassEntity } from "home-assistant-js-websocket";
import computeObjectId from "./compute_object_id";

type CachedDisplayEntity = HassEntity & {
  _entityDisplay?: string;
};

export default function computeStateName(stateObj: HassEntity | undefined) {
  if (!stateObj) {
    return "";
  }
  const state = stateObj as CachedDisplayEntity;

  if (state._entityDisplay === undefined) {
    state._entityDisplay =
      state.attributes.friendly_name ||
      computeObjectId(state.entity_id).replace(/_/g, " ");
  }

  return state._entityDisplay;
}
