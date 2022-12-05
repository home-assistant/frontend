import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../../../common/entity/compute_domain";
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
