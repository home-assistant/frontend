import { describe, expect, it } from "vitest";
import { filterTargetEntries } from "../../../src/components/target-picker/filter-target-entries";
import type { HomeAssistantRegistries } from "../../../src/types";
import {
  mockArea,
  mockDevice,
  mockEntity,
} from "../../common/entity/context/context-mock";

// The rows and the exclusions both narrow a target with this, so which
// devices a target reaches decides what an exclusion is reported to take out.
describe("filterTargetEntries", () => {
  const areas = {
    kitchen: mockArea({ area_id: "kitchen" }),
    office: mockArea({ area_id: "office" }),
  } as unknown as HomeAssistantRegistries["areas"];
  const devices = {
    fridge: mockDevice({ id: "fridge", area_id: "kitchen" }),
    hub: mockDevice({ id: "hub", area_id: "office" }),
  } as unknown as HomeAssistantRegistries["devices"];
  const entities = {
    "light.fridge": mockEntity({
      entity_id: "light.fridge",
      device_id: "fridge",
    }),
    // Assigned to the kitchen itself, while its device is in the office.
    "light.counter": mockEntity({
      entity_id: "light.counter",
      device_id: "hub",
      area_id: "kitchen",
    }),
  } as unknown as HomeAssistantRegistries["entities"];

  it("applies the device filter only to devices the target reaches", () => {
    const { referenced_entities } = filterTargetEntries(
      {},
      entities,
      devices,
      areas,
      { type: "area", id: "kitchen" },
      {
        referenced_areas: ["kitchen"],
        referenced_devices: ["fridge"],
        referenced_entities: ["light.fridge", "light.counter"],
      },
      { deviceFilter: () => false }
    );

    // The fridge is in the kitchen and filtered out with its light. The hub
    // isn't reached through the kitchen, so its light stays.
    expect(referenced_entities).toEqual(["light.counter"]);
  });
});
