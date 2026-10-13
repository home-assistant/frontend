import { describe, expect, it } from "vitest";
import { computeTargetSubRows } from "../../../src/components/target-picker/compute-target-sub-rows";
import type { ExtractFromTargetResultReferenced } from "../../../src/data/target";
import {
  mockDevice,
  mockEntity,
} from "../../common/entity/context/context-mock";

const entries = (
  referenced: Partial<ExtractFromTargetResultReferenced>
): ExtractFromTargetResultReferenced => ({
  referenced_areas: [],
  referenced_devices: [],
  referenced_entities: [],
  ...referenced,
});

// A power strip in the garage with two outlets. The outlets have no area of
// their own and inherit the garage from the strip.
const entities = {
  "sensor.strip_power": mockEntity({
    entity_id: "sensor.strip_power",
    device_id: "strip",
  }),
  "sensor.outlet_1_power": mockEntity({
    entity_id: "sensor.outlet_1_power",
    device_id: "outlet_1",
  }),
  "sensor.outlet_2_power": mockEntity({
    entity_id: "sensor.outlet_2_power",
    device_id: "outlet_2",
  }),
};
const devices = {
  strip: mockDevice({ id: "strip", area_id: "garage" }),
  outlet_1: mockDevice({ id: "outlet_1", parent_device_id: "strip" }),
  outlet_2: mockDevice({ id: "outlet_2", parent_device_id: "strip" }),
};
const allDevices = Object.keys(devices);
const allEntities = Object.keys(entities);

describe("computeTargetSubRows", () => {
  it("nests child devices under a device target and keeps its own entities as rows", () => {
    const subRows = computeTargetSubRows(
      "device",
      "strip",
      entries({
        referenced_devices: allDevices,
        referenced_entities: allEntities,
      }),
      entities,
      devices
    );

    expect(subRows.nextType).toBe("entity");
    expect(subRows.rows).toEqual(["sensor.strip_power"]);
    expect(subRows.deviceRows).toEqual(["outlet_1", "outlet_2"]);
    expect(subRows.deviceRowEntries?.map((e) => e.referenced_entities)).toEqual(
      [["sensor.outlet_1_power"], ["sensor.outlet_2_power"]]
    );
  });

  it("lists a child device only under its parent for an area target", () => {
    const subRows = computeTargetSubRows(
      "area",
      "garage",
      entries({
        referenced_devices: allDevices,
        referenced_entities: allEntities,
      }),
      entities,
      devices
    );

    expect(subRows.nextType).toBe("device");
    expect(subRows.rows).toEqual(["strip"]);
    expect(subRows.rowEntries?.[0].referenced_entities).toEqual(allEntities);
    expect(subRows.deviceRows).toEqual([]);
    expect(subRows.entityRows).toEqual([]);
  });

  it("puts a child device in its parent's area when browsing from a floor", () => {
    const subRows = computeTargetSubRows(
      "floor",
      "ground",
      entries({
        referenced_areas: ["garage"],
        referenced_devices: allDevices,
        referenced_entities: allEntities,
      }),
      entities,
      devices
    );

    expect(subRows.nextType).toBe("area");
    expect(subRows.rows).toEqual(["garage"]);
    expect(subRows.rowEntries?.[0].referenced_devices).toEqual(["strip"]);
    expect(subRows.rowEntries?.[0].referenced_entities).toEqual(allEntities);
  });

  it("does not duplicate a labeled child device under its labeled parent", () => {
    const labeled = {
      strip: mockDevice({ id: "strip", labels: ["power"] }),
      outlet_1: mockDevice({
        id: "outlet_1",
        parent_device_id: "strip",
        labels: ["power"],
      }),
    };
    const subRows = computeTargetSubRows(
      "label",
      "power",
      entries({
        referenced_devices: ["strip", "outlet_1"],
        referenced_entities: ["sensor.strip_power", "sensor.outlet_1_power"],
      }),
      entities,
      labeled
    );

    expect(subRows.nextType).toBe("device");
    expect(subRows.rows).toEqual([]);
    expect(subRows.deviceRows).toEqual(["strip"]);
    expect(subRows.deviceRowEntries?.[0].referenced_entities).toEqual([
      "sensor.strip_power",
      "sensor.outlet_1_power",
    ]);
    expect(subRows.entityRows).toEqual([]);
  });

  it("keeps a labeled child device at the top level when its parent is not labeled", () => {
    const labeled = {
      strip: mockDevice({ id: "strip" }),
      outlet_1: mockDevice({
        id: "outlet_1",
        parent_device_id: "strip",
        labels: ["power"],
      }),
    };
    const subRows = computeTargetSubRows(
      "label",
      "power",
      entries({
        referenced_devices: ["outlet_1"],
        referenced_entities: ["sensor.outlet_1_power"],
      }),
      entities,
      labeled
    );

    expect(subRows.deviceRows).toEqual(["outlet_1"]);
    expect(subRows.deviceRowEntries?.[0].referenced_entities).toEqual([
      "sensor.outlet_1_power",
    ]);
  });
});
