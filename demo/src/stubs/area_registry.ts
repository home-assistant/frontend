import type { AreaRegistryEntry } from "../../../src/data/area/area_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export interface DemoArea {
  area_id: string;
  name: string;
  floor_id?: string;
  icon?: string;
  temperature_entity_id?: string;
  humidity_entity_id?: string;
}

let areas: AreaRegistryEntry[] = [];

export const mockAreaRegistry = (hass: MockHomeAssistant) => {
  hass.mockWS("config/area_registry/list", () => areas);
};

/** Set the areas of the currently loaded demo config. */
export const setDemoAreas = (
  hass: MockHomeAssistant,
  demoAreas: DemoArea[] = []
) => {
  areas = demoAreas.map((area) => ({
    area_id: area.area_id,
    name: area.name,
    floor_id: area.floor_id ?? null,
    icon: area.icon ?? null,
    temperature_entity_id: area.temperature_entity_id ?? null,
    humidity_entity_id: area.humidity_entity_id ?? null,
    aliases: [],
    labels: [],
    picture: null,
    created_at: 0,
    modified_at: 0,
  }));
  const areasById: Record<string, AreaRegistryEntry> = {};
  areas.forEach((area) => {
    areasById[area.area_id] = area;
  });
  hass.updateHass({ areas: areasById });
};
