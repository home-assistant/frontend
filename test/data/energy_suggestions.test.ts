import type { HassEntities } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";
import type { EnergyPreferences } from "../../src/data/energy";
import {
  EMPTY_PREFERENCES,
  emptyGasEnergyPreference,
  emptyGridSourceEnergyPreference,
} from "../../src/data/energy";
import type { EnergySuggestionInput } from "../../src/data/energy_suggestions";
import {
  addEnergySuggestion,
  computeEnergySuggestions,
  suggestionTab,
} from "../../src/data/energy_suggestions";
import type { EntityRegistryDisplayEntry } from "../../src/data/entity/entity_registry";
import type { StatisticsMetaData } from "../../src/data/recorder";
import { StatisticMeanType } from "../../src/data/recorder";

interface TestSensor {
  entityId: string;
  deviceId?: string;
  platform?: string;
  translationKey?: string;
  deviceClass?: string;
  unitClass?: string;
  attributes?: Record<string, unknown>;
  state?: string;
  model?: string;
}

const buildInput = (
  sensors: TestSensor[],
  preferences: EnergyPreferences = EMPTY_PREFERENCES,
  dismissed: string[] = []
): EnergySuggestionInput => {
  const statistics: StatisticsMetaData[] = [];
  const states: HassEntities = {};
  const entities: Record<string, EntityRegistryDisplayEntry> = {};
  const devices: Record<string, DeviceRegistryEntry> = {};
  for (const sensor of sensors) {
    const unitClass = sensor.unitClass ?? "energy";
    statistics.push({
      statistic_id: sensor.entityId,
      source: "recorder",
      has_sum: true,
      mean_type: StatisticMeanType.NONE,
      unit_class: unitClass,
      statistics_unit_of_measurement: unitClass === "energy" ? "kWh" : "m³",
    });
    states[sensor.entityId] = {
      entity_id: sensor.entityId,
      state: sensor.state ?? "1",
      attributes: {
        device_class:
          sensor.deviceClass ?? (unitClass === "energy" ? "energy" : undefined),
        ...sensor.attributes,
      },
      last_changed: "",
      last_updated: "",
      context: { id: "", parent_id: null, user_id: null },
    };
    entities[sensor.entityId] = {
      entity_id: sensor.entityId,
      device_id: sensor.deviceId,
      platform: sensor.platform ?? "demo",
      translation_key: sensor.translationKey,
      labels: [],
    };
    if (sensor.deviceId) {
      devices[sensor.deviceId] = {
        id: sensor.deviceId,
        model: sensor.model ?? null,
      } as DeviceRegistryEntry;
    }
  }
  return { statistics, preferences, states, entities, devices, dismissed };
};

const slots = (input: EnergySuggestionInput) =>
  Object.fromEntries(
    computeEnergySuggestions(input).map((s) => [s.statisticId, s.slot])
  );

describe("computeEnergySuggestions", () => {
  it("excludes statistics that are already configured or dismissed", () => {
    const input = buildInput(
      [
        { entityId: "sensor.plug_a_energy", deviceId: "a" },
        { entityId: "sensor.plug_b_energy", deviceId: "b" },
        { entityId: "sensor.plug_c_energy", deviceId: "c" },
      ],
      {
        ...EMPTY_PREFERENCES,
        device_consumption: [{ stat_consumption: "sensor.plug_a_energy" }],
      },
      ["sensor.plug_b_energy"]
    );
    expect(slots(input)).toEqual({ "sensor.plug_c_energy": "device" });
  });

  it("skips statistics without a sum, another unit class or a state", () => {
    const input = buildInput([
      { entityId: "sensor.temperature", unitClass: "temperature" },
      { entityId: "sensor.plug_energy", deviceId: "a" },
    ]);
    input.statistics.push({
      ...input.statistics[1],
      statistic_id: "sensor.removed_energy",
    });
    input.statistics[1] = { ...input.statistics[1], has_sum: false };
    expect(slots(input)).toEqual({});
  });

  it("suggests gas and water by device class and unit class", () => {
    const input = buildInput([
      {
        entityId: "sensor.meter_gas",
        deviceId: "g",
        unitClass: "volume",
        deviceClass: "gas",
      },
      {
        entityId: "sensor.meter_water",
        deviceId: "w",
        unitClass: "volume",
        deviceClass: "water",
      },
      {
        entityId: "sensor.boiler_gas_energy",
        deviceId: "b",
        deviceClass: "gas",
      },
      { entityId: "sensor.tank_volume", deviceId: "t", unitClass: "volume" },
    ]);
    expect(slots(input)).toEqual({
      "sensor.meter_gas": "gas",
      "sensor.meter_water": "water",
      "sensor.boiler_gas_energy": "gas",
    });
  });

  it("decides grid import and export by words", () => {
    const input = buildInput([
      { entityId: "sensor.meter_energy_import", deviceId: "m" },
      { entityId: "sensor.meter_energy_export", deviceId: "m" },
      {
        entityId: "sensor.p1_electricity_delivered_tariff_1",
        deviceId: "p",
        platform: "dsmr",
      },
      {
        entityId: "sensor.p1_electricity_used_tariff_1",
        deviceId: "p",
        platform: "dsmr",
      },
      { entityId: "sensor.shelly_energy_returned", deviceId: "s" },
    ]);
    expect(slots(input)).toEqual({
      "sensor.meter_energy_import": "grid_import",
      "sensor.p1_electricity_used_tariff_1": "grid_import",
      "sensor.meter_energy_export": "grid_export",
      "sensor.p1_electricity_delivered_tariff_1": "grid_export",
      "sensor.shelly_energy_returned": "grid_export",
    });
  });

  it("treats production on a smart meter as export", () => {
    const input = buildInput([
      {
        entityId: "sensor.p1_meter_energy_production_low",
        deviceId: "p",
        platform: "p1_monitor",
      },
    ]);
    expect(slots(input)).toEqual({
      "sensor.p1_meter_energy_production_low": "grid_export",
    });
  });

  it("suggests solar by integration and by words", () => {
    const input = buildInput([
      {
        entityId: "sensor.sb_5_0_total_yield",
        deviceId: "i",
        platform: "sma",
      },
      {
        entityId: "sensor.envoy_lifetime_energy_consumption",
        deviceId: "e",
        platform: "enphase_envoy",
      },
      { entityId: "sensor.garage_pv_energy", deviceId: "g" },
    ]);
    expect(slots(input)).toEqual({
      "sensor.sb_5_0_total_yield": "solar",
      "sensor.garage_pv_energy": "solar",
    });
  });

  it("suggests the tariffs of a meter and not its total", () => {
    const input = buildInput([
      { entityId: "sensor.p1_energy_import_t1", deviceId: "p" },
      { entityId: "sensor.p1_energy_import_t2", deviceId: "p" },
      { entityId: "sensor.p1_energy_import", deviceId: "p" },
      { entityId: "sensor.p1_energy_export", deviceId: "p" },
    ]);
    expect(slots(input)).toEqual({
      "sensor.p1_energy_import_t1": "grid_import",
      "sensor.p1_energy_import_t2": "grid_import",
      "sensor.p1_energy_export": "grid_export",
    });
  });

  it("suggests the missing tariff but nothing when the total is configured", () => {
    const sensors = [
      { entityId: "sensor.p1_energy_import_t1", deviceId: "p" },
      { entityId: "sensor.p1_energy_import_t2", deviceId: "p" },
      { entityId: "sensor.p1_energy_import", deviceId: "p" },
    ];
    const withGrid = (statId: string): EnergyPreferences => ({
      ...EMPTY_PREFERENCES,
      energy_sources: [
        { ...emptyGridSourceEnergyPreference(), stat_energy_from: statId },
      ],
    });
    expect(
      slots(buildInput(sensors, withGrid("sensor.p1_energy_import_t1")))
    ).toEqual({ "sensor.p1_energy_import_t2": "grid_import" });
    expect(
      slots(buildInput(sensors, withGrid("sensor.p1_energy_import")))
    ).toEqual({});
  });

  it("skips a device that already has a meter in the same slot", () => {
    const input = buildInput(
      [
        { entityId: "sensor.plug_energy", deviceId: "a" },
        { entityId: "sensor.plug_energy_today", deviceId: "a" },
        { entityId: "sensor.dryer_energy_today", deviceId: "b" },
        { entityId: "sensor.dryer_energy", deviceId: "b" },
      ],
      {
        ...EMPTY_PREFERENCES,
        device_consumption: [{ stat_consumption: "sensor.plug_energy" }],
      }
    );
    expect(slots(input)).toEqual({ "sensor.dryer_energy": "device" });
  });

  it("pairs battery charge and discharge on one device", () => {
    const input = buildInput([
      { entityId: "sensor.battery_charge_energy", deviceId: "b" },
      { entityId: "sensor.battery_discharge_energy", deviceId: "b" },
      { entityId: "sensor.wallbox_charged_energy", deviceId: "w" },
    ]);
    const suggestions = computeEnergySuggestions(input);
    expect(suggestions.map((s) => [s.statisticId, s.slot])).toEqual([
      ["sensor.battery_discharge_energy", "battery"],
      ["sensor.wallbox_charged_energy", "device"],
    ]);
    expect(suggestions[0].pairedStatisticId).toBe(
      "sensor.battery_charge_energy"
    );
  });

  it("skips utility meters and integration helpers of configured sources", () => {
    const input = buildInput(
      [
        { entityId: "sensor.daily_energy", platform: "utility_meter" },
        {
          entityId: "sensor.heater_energy",
          platform: "integration",
          attributes: { source: "sensor.heater_power" },
        },
        {
          entityId: "sensor.fan_energy",
          platform: "integration",
          attributes: { source: "sensor.fan_power" },
        },
      ],
      {
        ...EMPTY_PREFERENCES,
        device_consumption: [
          {
            stat_consumption: "sensor.heater_energy_old",
            stat_rate: "sensor.heater_power",
          },
        ],
      }
    );
    expect(slots(input)).toEqual({ "sensor.fan_energy": "device" });
  });

  it("falls back to individual devices", () => {
    const input = buildInput([
      { entityId: "sensor.washing_machine_energy", deviceId: "w" },
      { entityId: "sensor.tv_total_consumption", deviceId: "t" },
    ]);
    expect(slots(input)).toEqual({
      "sensor.tv_total_consumption": "device",
      "sensor.washing_machine_energy": "device",
    });
  });
});

describe("addEnergySuggestion", () => {
  it("adds grid import and export to one connection", () => {
    const imported = addEnergySuggestion(EMPTY_PREFERENCES, {
      statisticId: "sensor.import",
      slot: "grid_import",
      slots: [],
    });
    const both = addEnergySuggestion(imported, {
      statisticId: "sensor.export",
      slot: "grid_export",
      slots: [],
    });
    expect(both.energy_sources).toEqual([
      {
        ...emptyGridSourceEnergyPreference(),
        stat_energy_from: "sensor.import",
        stat_energy_to: "sensor.export",
      },
    ]);
  });

  it("adds a meter to the slot the user picked", () => {
    const prefs = addEnergySuggestion(
      EMPTY_PREFERENCES,
      { statisticId: "sensor.x", slot: "solar", slots: [] },
      "device"
    );
    expect(prefs.energy_sources).toEqual([]);
    expect(prefs.device_consumption).toEqual([
      { stat_consumption: "sensor.x" },
    ]);
  });

  it("adds a battery with both statistics", () => {
    const prefs = addEnergySuggestion(EMPTY_PREFERENCES, {
      statisticId: "sensor.discharge",
      pairedStatisticId: "sensor.charge",
      slot: "battery",
      slots: ["battery"],
    });
    expect(prefs.energy_sources).toEqual([
      {
        type: "battery",
        stat_energy_from: "sensor.discharge",
        stat_energy_to: "sensor.charge",
      },
    ]);
  });
});

describe("suggestionTab", () => {
  it.each([
    ["grid_import", "electricity"],
    ["grid_export", "electricity"],
    ["solar", "electricity"],
    ["battery", "electricity"],
    ["device", "electricity"],
    ["gas", "gas"],
    ["water", "water"],
  ] as const)("puts %s on the %s tab", (slot, tab) => {
    expect(suggestionTab(slot)).toBe(tab);
  });
});

describe("computeEnergySuggestions review fixes", () => {
  const offeredSlots = (input: EnergySuggestionInput) =>
    Object.fromEntries(
      computeEnergySuggestions(input).map((s) => [s.statisticId, s.slots])
    );

  it("only offers slots the unit of a meter fits", () => {
    const input = buildInput([
      {
        entityId: "sensor.boiler_gas_energy",
        deviceId: "b",
        deviceClass: "gas",
      },
      {
        entityId: "sensor.meter_gas",
        deviceId: "g",
        unitClass: "volume",
        deviceClass: "gas",
      },
    ]);
    expect(offeredSlots(input)).toEqual({
      "sensor.boiler_gas_energy": [
        "grid_import",
        "grid_export",
        "solar",
        "gas",
        "device",
      ],
      "sensor.meter_gas": ["gas", "water"],
    });
  });

  it("doesn't mix gas units with the configured gas meter", () => {
    const sensors = [
      {
        entityId: "sensor.boiler_gas_energy",
        deviceId: "b",
        deviceClass: "gas",
      },
      {
        entityId: "sensor.meter_gas",
        deviceId: "g",
        unitClass: "volume",
        deviceClass: "gas",
      },
      {
        entityId: "sensor.cabin_gas",
        deviceId: "c",
        unitClass: "volume",
        deviceClass: "gas",
      },
    ];
    const input = buildInput(sensors, {
      ...EMPTY_PREFERENCES,
      energy_sources: [
        { ...emptyGasEnergyPreference(), stat_energy_from: "sensor.meter_gas" },
      ],
    });
    expect(offeredSlots(input)).toEqual({
      "sensor.cabin_gas": ["gas", "water"],
    });
  });

  it("keeps a configured meter without a state for deduplication", () => {
    const input = buildInput(
      [
        { entityId: "sensor.p1_energy_import_t1", deviceId: "p" },
        { entityId: "sensor.p1_energy_import", deviceId: "p" },
      ],
      {
        ...EMPTY_PREFERENCES,
        energy_sources: [
          {
            ...emptyGridSourceEnergyPreference(),
            stat_energy_from: "sensor.p1_energy_import",
          },
        ],
      }
    );
    delete input.states["sensor.p1_energy_import"];
    expect(slots(input)).toEqual({});
  });

  it("doesn't suggest a lone charge meter when its device has a meter", () => {
    const input = buildInput(
      [
        { entityId: "sensor.wallbox_energy", deviceId: "w" },
        { entityId: "sensor.wallbox_charged_energy", deviceId: "w" },
      ],
      {
        ...EMPTY_PREFERENCES,
        device_consumption: [{ stat_consumption: "sensor.wallbox_energy" }],
      }
    );
    expect(slots(input)).toEqual({});
  });
});

describe("computeEnergySuggestions second review", () => {
  it("picks the gas meter of a device that fits the configured gas unit", () => {
    const input = buildInput(
      [
        {
          entityId: "sensor.boiler_gas_energy",
          deviceId: "b",
          deviceClass: "gas",
        },
        {
          entityId: "sensor.boiler_gas_volume",
          deviceId: "b",
          unitClass: "volume",
          deviceClass: "gas",
        },
        {
          entityId: "sensor.meter_gas",
          deviceId: "g",
          unitClass: "volume",
          deviceClass: "gas",
        },
      ],
      {
        ...EMPTY_PREFERENCES,
        energy_sources: [
          {
            ...emptyGasEnergyPreference(),
            stat_energy_from: "sensor.meter_gas",
          },
        ],
      }
    );
    expect(slots(input)).toEqual({ "sensor.boiler_gas_volume": "gas" });
  });

  it("pairs a home battery that names its meters import and export", () => {
    const input = buildInput([
      {
        entityId: "sensor.hwe_bat_energy_import",
        deviceId: "bat",
        platform: "homewizard",
        model: "Plug-In Battery",
      },
      {
        entityId: "sensor.hwe_bat_energy_export",
        deviceId: "bat",
        platform: "homewizard",
        model: "Plug-In Battery",
      },
    ]);
    expect(computeEnergySuggestions(input)).toEqual([
      {
        statisticId: "sensor.hwe_bat_energy_export",
        slot: "battery",
        slots: ["battery"],
        pairedStatisticId: "sensor.hwe_bat_energy_import",
        deviceId: "bat",
      },
    ]);
  });

  it("suggests each channel of a device, but not a repeated counter", () => {
    const sensors = [
      {
        entityId: "sensor.dual_plug_channel_1_energy",
        deviceId: "d",
        state: "12.5",
      },
      {
        entityId: "sensor.dual_plug_channel_2_energy",
        deviceId: "d",
        state: "3.25",
      },
      {
        entityId: "sensor.dual_plug_energy_consumed",
        deviceId: "d",
        state: "12.5",
      },
    ];
    expect(slots(buildInput(sensors))).toEqual({
      "sensor.dual_plug_channel_1_energy": "device",
      "sensor.dual_plug_channel_2_energy": "device",
    });
    expect(
      slots(
        buildInput(sensors, {
          ...EMPTY_PREFERENCES,
          device_consumption: [
            { stat_consumption: "sensor.dual_plug_channel_1_energy" },
          ],
        })
      )
    ).toEqual({ "sensor.dual_plug_channel_2_energy": "device" });
  });
});
