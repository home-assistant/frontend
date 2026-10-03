import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "./compute_state_domain";

export interface EntityLocation {
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
}

const findFirstActiveZone = (
  inZones: readonly string[],
  states: HassEntities
): HassEntity | undefined => {
  for (const zoneId of inZones) {
    const zone = states[zoneId];
    if (
      zone &&
      !zone.attributes.passive &&
      typeof zone.attributes.latitude === "number" &&
      typeof zone.attributes.longitude === "number"
    ) {
      return zone;
    }
  }
  return undefined;
};

export const getEntityLocation = (
  stateObj: HassEntity,
  states: HassEntities
): EntityLocation | undefined => {
  const {
    latitude,
    longitude,
    gps_accuracy: gpsAccuracy,
  } = stateObj.attributes;
  if (typeof latitude === "number" && typeof longitude === "number") {
    return { latitude, longitude, gpsAccuracy };
  }

  if (computeStateDomain(stateObj) !== "person") {
    return undefined;
  }

  const inZones = stateObj.attributes.in_zones;
  if (!Array.isArray(inZones) || inZones.length === 0) {
    return undefined;
  }

  const zone = findFirstActiveZone(inZones, states);
  if (!zone) {
    return undefined;
  }

  return {
    latitude: zone.attributes.latitude,
    longitude: zone.attributes.longitude,
  };
};
