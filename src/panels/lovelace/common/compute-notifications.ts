import { HassEntities, HassEntity } from "home-assistant-js-websocket";

import computeDomain from "../../../common/entity/compute_domain";

export const computeNotifications = (states: HassEntities): HassEntity[] => {
  return Object.keys(states)
    .filter((entityId) => computeDomain(entityId) === "configurator")
    .map((entityId) => states[entityId]);
};
