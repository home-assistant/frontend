import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { HOME_ZONE_ENTITY_ID } from "../common/map/entity-map-colors";
import { navigate } from "../common/navigate";
import type { HomeAssistant } from "../types";
import { UNAVAILABLE, UNKNOWN } from "./entity/entity";

export interface Zone {
  id: string;
  name: string;
  icon?: string;
  latitude: number;
  longitude: number;
  passive?: boolean;
  radius?: number;
}

export interface HomeZoneMutableParams {
  name?: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface ZoneMutableParams {
  name: string;
  icon?: string;
  latitude: number;
  longitude: number;
  passive?: boolean;
  radius?: number;
}

// Same rule as the backend device tracker: "home" for the home zone, the zone
// state name (friendly_name, or the object id) for any other zone.
export const computeZoneTrackerState = (zone: HassEntity): string =>
  zone.entity_id === HOME_ZONE_ENTITY_ID ? "home" : computeStateName(zone);

export const getEntityActiveZone = (
  entity: HassEntity,
  states: HassEntities
): HassEntity | undefined => {
  if (["not_home", UNKNOWN, UNAVAILABLE].includes(entity.state)) {
    return undefined;
  }

  const inZones: string[] | undefined = entity.attributes.in_zones;
  if (Array.isArray(inZones) && inZones.length > 0) {
    return inZones
      .map((zoneId) => states[zoneId])
      .find(
        (zone) =>
          zone &&
          computeStateDomain(zone) === "zone" &&
          !zone.attributes.passive
      );
  }

  if (entity.state === "home") {
    const homeZone = states[HOME_ZONE_ENTITY_ID];
    return homeZone && !homeZone.attributes.passive ? homeZone : undefined;
  }

  const matchingZones = Object.values(states).filter(
    (zone) =>
      computeStateDomain(zone) === "zone" &&
      !zone.attributes.passive &&
      entity.state === computeZoneTrackerState(zone)
  );
  return matchingZones.length === 1 ? matchingZones[0] : undefined;
};

export const fetchZones = (hass: HomeAssistant) =>
  hass.callWS<Zone[]>({ type: "zone/list" });

export const createZone = (hass: HomeAssistant, values: ZoneMutableParams) =>
  hass.callWS<Zone>({
    type: "zone/create",
    ...values,
  });

export const updateZone = (
  hass: HomeAssistant,
  zoneId: string,
  updates: Partial<ZoneMutableParams>
) =>
  hass.callWS<Zone>({
    type: "zone/update",
    zone_id: zoneId,
    ...updates,
  });

export const deleteZone = (hass: HomeAssistant, zoneId: string) =>
  hass.callWS({
    type: "zone/delete",
    zone_id: zoneId,
  });

let inititialZoneEditorData: Partial<ZoneMutableParams> | undefined;

export const showZoneEditor = (data?: Partial<ZoneMutableParams>) => {
  inititialZoneEditorData = data;
  navigate("/config/zone/new");
};

export const getZoneEditorInitData = () => {
  const data = inititialZoneEditorData;
  inititialZoneEditorData = undefined;
  return data;
};
