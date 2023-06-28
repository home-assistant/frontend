import { mdiExclamationThick } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { UNAVAILABLE, UNKNOWN } from "../../../../../data/entity";
import { HomeAssistant } from "../../../../../types";
import { computeClimateBadge } from "./tile-badge-climate";
import { computePersonBadge } from "./tile-badge-person";
import { computeHumidifierBadge } from "./tile-badge-humidifier";

export type TileBadge = {
  color?: string;
  icon?: string;
  iconPath?: string;
};

export type ComputeBadgeFunction = (
  stateObj: HassEntity,
  hass: HomeAssistant
) => TileBadge | undefined;

export const computeTileBadge: ComputeBadgeFunction = (stateObj, hass) => {
  if (stateObj.state === UNKNOWN) {
    return undefined;
  }
  if (stateObj.state === UNAVAILABLE) {
    return {
      color: "var(--orange-color)",
      iconPath: mdiExclamationThick,
    };
  }
  const domain = computeDomain(stateObj.entity_id);
  switch (domain) {
    case "person":
    case "device_tracker":
      return computePersonBadge(stateObj, hass);
    case "climate":
      return computeClimateBadge(stateObj, hass);
    case "humidifier":
      return computeHumidifierBadge(stateObj, hass);
    default:
      return undefined;
  }
};
