import type { HassEntities } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { EnergyPreferences } from "../../src/data/energy";
import {
  EMPTY_PREFERENCES,
  emptyGasEnergyPreference,
  emptyGridSourceEnergyPreference,
  emptyHomeEnergyPreference,
} from "../../src/data/energy";
import type { EnergySuggestionInput } from "../../src/data/energy_suggestions";
import {
  computeEnergySuggestions,
  updateDismissedSuggestions,
} from "../../src/data/energy_suggestions";
import type { StatisticsMetaData } from "../../src/data/recorder";
import { StatisticMeanType } from "../../src/data/recorder";

interface TestSensor {
  entityId: string;
  deviceClass?: string;
  unitClass?: string;
  hasSum?: boolean;
  noState?: boolean;
  // The statistic a helper like utility_meter is derived from
  source?: string;
}

const statistic = (
  statisticId: string,
  unitClass = "energy",
  hasSum = true
): StatisticsMetaData => ({
  statistic_id: statisticId,
  source: "recorder",
  has_sum: hasSum,
  mean_type: StatisticMeanType.NONE,
  unit_class: unitClass,
  statistics_unit_of_measurement: unitClass === "energy" ? "kWh" : "m³",
});

const buildInput = (
  sensors: TestSensor[],
  preferences: EnergyPreferences = EMPTY_PREFERENCES,
  dismissed: string[] = []
): EnergySuggestionInput => {
  const states: HassEntities = {};
  for (const sensor of sensors) {
    if (sensor.noState) {
      continue;
    }
    states[sensor.entityId] = {
      entity_id: sensor.entityId,
      state: "1",
      attributes: {
        device_class: sensor.deviceClass ?? "energy",
        source: sensor.source,
      },
      last_changed: "",
      last_updated: "",
      context: { id: "", parent_id: null, user_id: null },
    };
  }
  return {
    statistics: sensors.map((sensor) =>
      statistic(sensor.entityId, sensor.unitClass, sensor.hasSum)
    ),
    preferences,
    states,
    dismissed,
  };
};

const tabs = (input: EnergySuggestionInput) =>
  Object.fromEntries(
    computeEnergySuggestions(input).map((s) => [s.statisticId, s.tab])
  );

describe("computeEnergySuggestions", () => {
  it("excludes statistics that are already configured or dismissed", () => {
    const input = buildInput(
      [
        { entityId: "sensor.plug_a_energy" },
        { entityId: "sensor.plug_b_energy" },
        { entityId: "sensor.plug_c_energy" },
      ],
      {
        ...EMPTY_PREFERENCES,
        device_consumption: [{ stat_consumption: "sensor.plug_a_energy" }],
      },
      ["sensor.plug_b_energy"]
    );
    expect(tabs(input)).toEqual({ "sensor.plug_c_energy": "electricity" });
  });

  it("skips statistics without a sum, a state or a known device class", () => {
    const input = buildInput([
      { entityId: "sensor.no_sum", hasSum: false },
      { entityId: "sensor.removed", noState: true },
      { entityId: "sensor.stored_energy", deviceClass: "energy_storage" },
      { entityId: "sensor.water_in_kwh", deviceClass: "water" },
    ]);
    expect(tabs(input)).toEqual({});
  });

  it("puts each meter on the tab of its device class", () => {
    const input = buildInput([
      { entityId: "sensor.meter_energy" },
      { entityId: "sensor.meter_gas", deviceClass: "gas", unitClass: "volume" },
      {
        entityId: "sensor.meter_water",
        deviceClass: "water",
        unitClass: "volume",
      },
    ]);
    expect(computeEnergySuggestions(input)).toEqual([
      {
        statisticId: "sensor.meter_energy",
        tab: "electricity",
        slots: [
          "grid_import",
          "grid_export",
          "solar",
          "battery_charge",
          "battery_discharge",
          "home",
          "device",
        ],
      },
      {
        statisticId: "sensor.meter_gas",
        tab: "gas",
        slots: ["gas", "device_gas"],
      },
      {
        statisticId: "sensor.meter_water",
        tab: "water",
        slots: ["water", "device_water"],
      },
    ]);
  });

  it("offers no whole-home meter when one is configured", () => {
    const input = buildInput([{ entityId: "sensor.meter_energy" }], {
      ...EMPTY_PREFERENCES,
      energy_sources: [
        { ...emptyHomeEnergyPreference(), stat_energy_to: "sensor.home" },
      ],
    });
    expect(computeEnergySuggestions(input)[0].slots).not.toContain("home");
  });

  it("skips meters derived from a configured statistic", () => {
    const input = buildInput(
      [
        { entityId: "sensor.grid_import" },
        { entityId: "sensor.grid_import_daily", source: "sensor.grid_import" },
        { entityId: "sensor.plug_energy", source: "sensor.plug_power" },
      ],
      {
        ...EMPTY_PREFERENCES,
        energy_sources: [
          {
            ...emptyGridSourceEnergyPreference(),
            stat_energy_from: "sensor.grid_import",
          },
        ],
      }
    );
    expect(tabs(input)).toEqual({ "sensor.plug_energy": "electricity" });
  });

  it("skips the source of a configured meter", () => {
    const input = buildInput(
      [
        { entityId: "sensor.grid_total" },
        { entityId: "sensor.grid_peak", source: "sensor.grid_total" },
        { entityId: "sensor.grid_offpeak", source: "sensor.grid_total" },
      ],
      {
        ...EMPTY_PREFERENCES,
        energy_sources: [
          {
            ...emptyGridSourceEnergyPreference(),
            stat_energy_from: "sensor.grid_peak",
          },
        ],
      }
    );
    expect(tabs(input)).toEqual({ "sensor.grid_offpeak": "electricity" });
  });

  it.each([
    {
      ...EMPTY_PREFERENCES,
      energy_sources: [
        {
          ...emptyGasEnergyPreference(),
          stat_energy_from: "sensor.gas_energy",
        },
      ],
    },
    {
      ...EMPTY_PREFERENCES,
      device_consumption_gas: [{ stat_consumption: "sensor.gas_energy" }],
    },
  ])("doesn't mix gas units with the configured gas meter", (preferences) => {
    const input = buildInput(
      [
        { entityId: "sensor.gas_energy" },
        { entityId: "sensor.gas_new", deviceClass: "gas", unitClass: "volume" },
      ],
      preferences
    );
    expect(tabs(input)).toEqual({});
  });
});

describe("updateDismissedSuggestions", () => {
  it("adds the statistic and drops statistics that no longer exist", () => {
    expect(
      updateDismissedSuggestions(
        ["sensor.removed", "sensor.kept", "sensor.new"],
        "sensor.new",
        [
          statistic("sensor.kept"),
          statistic("sensor.new"),
          statistic("sensor.other"),
        ]
      )
    ).toEqual(["sensor.kept", "sensor.new"]);
  });
});
