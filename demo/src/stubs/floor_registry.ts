import type { FloorRegistryEntry } from "../../../src/data/floor_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export interface DemoFloor {
  floor_id: string;
  name: string;
  level?: number;
  icon?: string;
}

let floors: FloorRegistryEntry[] = [];

const setFloors = (hass: MockHomeAssistant, data: FloorRegistryEntry[]) => {
  floors = data;
  const floorsById: Record<string, FloorRegistryEntry> = {};
  floors.forEach((floor) => {
    floorsById[floor.floor_id] = floor;
  });
  hass.updateHass({ floors: floorsById });
};

export const mockFloorRegistry = (
  hass: MockHomeAssistant,
  data: FloorRegistryEntry[] = []
) => {
  hass.mockWS("config/floor_registry/list", () => floors);
  setFloors(hass, data);
};

/** Set the floors of the currently loaded demo config. */
export const setDemoFloors = (
  hass: MockHomeAssistant,
  demoFloors: DemoFloor[] = []
) => {
  setFloors(
    hass,
    demoFloors.map((floor) => ({
      floor_id: floor.floor_id,
      name: floor.name,
      level: floor.level ?? null,
      icon: floor.icon ?? null,
      aliases: [],
      created_at: 0,
      modified_at: 0,
    }))
  );
};
