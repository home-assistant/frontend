import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { UNAVAILABLE_STATES } from "../../../../../data/entity";
import { HomeAssistant } from "../../../../../types";
import { computeClimateBadge } from "./tile-badge-climate";
import { computePersonBadge } from "./tile-badge-person";

export type TileBadge = {
  color: string;
  icon?: string;
  iconPath?: string;
};

export type ComputeBadgeFunction = (
  stateObj: HassEntity,
  hass: HomeAssistant
) => TileBadge | undefined;

export const computeTileBadge: ComputeBadgeFunction = (stateObj, hass) => {
  if (UNAVAILABLE_STATES.includes(stateObj.state)) {
    return undefined;
  }
  const domain = computeDomain(stateObj.entity_id);
  switch (domain) {
    case "person":
    case "device_tracker":
      return computePersonBadge(stateObj, hass);
    case "climate":
      return computeClimateBadge(stateObj, hass);
    default:
      return undefined;
  }
};
