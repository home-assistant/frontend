import { HomeAssistant } from "../types";

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
}

export interface AreaRegistryEntryMutableParams {
  name: string;
}

export const fetchAreaRegistry = (hass: HomeAssistant) =>
  hass.callWS<AreaRegistryEntry[]>({ type: "config/area_registry/list" });

export const createAreaRegistryEntry = (
  hass: HomeAssistant,
  values: AreaRegistryEntryMutableParams
) =>
  hass.callWS<AreaRegistryEntry>({
    type: "config/area_registry/create",
    ...values,
  });

export const updateAreaRegistryEntry = (
  hass: HomeAssistant,
  areaId: string,
  updates: Partial<AreaRegistryEntryMutableParams>
) =>
  hass.callWS<AreaRegistryEntry>({
    type: "config/area_registry/update",
    area_id: areaId,
    ...updates,
  });

export const deleteAreaRegistryEntry = (hass: HomeAssistant, areaId: string) =>
  hass.callWS({
    type: "config/area_registry/delete",
    area_id: areaId,
  });
