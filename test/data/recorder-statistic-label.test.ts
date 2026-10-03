import { describe, expect, it } from "vitest";
import type { StatisticsMetaData } from "../../src/data/recorder";
import { getStatisticLabel, StatisticMeanType } from "../../src/data/recorder";
import {
  mockArea,
  mockDevice,
  mockEntity,
} from "../common/entity/context/context-mock";
import { createMockEntityState, createMockHass } from "../fixtures/hass";

const metadata = (
  statistic_id: string,
  name: string | null
): StatisticsMetaData => ({
  statistic_id,
  name,
  source: "recorder",
  statistics_unit_of_measurement: "kWh",
  has_sum: true,
  mean_type: StatisticMeanType.NONE,
  unit_class: "energy",
});

// The friendly name deliberately differs from the composed name, so the
// assertions fail if the label is taken from the attribute again.
const hassWithRegistry = () =>
  createMockHass(
    {
      "sensor.dishwasher_energy": createMockEntityState(
        "sensor.dishwasher_energy",
        "12",
        { friendly_name: "Smart plug 3 energy" }
      ),
    },
    {
      entities: {
        "sensor.dishwasher_energy": mockEntity({
          entity_id: "sensor.dishwasher_energy",
          device_id: "device_1",
          name: "Energy",
        }),
      },
      devices: {
        device_1: mockDevice({
          id: "device_1",
          name: "Dishwasher",
          area_id: "kitchen",
        }),
      },
      areas: { kitchen: mockArea({ area_id: "kitchen", name: "Kitchen" }) },
    }
  );

describe("getStatisticLabel", () => {
  it("composes the name from the registry rather than friendly_name", () => {
    expect(
      getStatisticLabel(
        hassWithRegistry(),
        "sensor.dishwasher_energy",
        metadata("sensor.dishwasher_energy", "Recorder name")
      )
    ).toBe("Dishwasher Energy");
  });

  // External statistics have no entity, so there is no registry context to
  // compose a name from and the recorder metadata is all we have.
  it("uses the metadata name when there is no entity", () => {
    expect(
      getStatisticLabel(
        createMockHass(),
        "energy:solar_production",
        metadata("energy:solar_production", "Solar production")
      )
    ).toBe("Solar production");
  });

  it("falls back to the statistic id when metadata has no name", () => {
    expect(
      getStatisticLabel(
        createMockHass(),
        "energy:solar_production",
        metadata("energy:solar_production", null)
      )
    ).toBe("energy:solar_production");
  });

  it("falls back to the statistic id when there is no metadata", () => {
    expect(
      getStatisticLabel(createMockHass(), "energy:solar_production", undefined)
    ).toBe("energy:solar_production");
  });
});
