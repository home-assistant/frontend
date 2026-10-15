import type { HassEntity } from "home-assistant-js-websocket";
import { computeStateName } from "../common/entity/compute_state_name";
import { HOME_ZONE_ENTITY_ID } from "../common/map/entity-map-colors";
import { navigate } from "../common/navigate";
import type { HomeAssistant } from "../types";

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
