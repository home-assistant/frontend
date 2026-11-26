import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockRecorder } from "../../demo/src/stubs/recorder";
import type {
  Statistic,
  Statistics,
  StatisticsMetaData,
} from "../../src/data/recorder";
import { StatisticMeanType } from "../../src/data/recorder";
import { provideHass } from "../../src/fake_data/provide_hass";

const setup = () => {
  const hass = provideHass(document.createElement("div"));

  hass.updateHass({ config: { ...hass.config, time_zone: "UTC" } });
  hass.addEntities([
    {
      entity_id: "sensor.outside_temperature",
      state: "12",
      attributes: {
        friendly_name: "Outside temperature",
        state_class: "measurement",
        unit_of_measurement: "°C",
      },
    },
    {
      entity_id: "sensor.battery_energy",
      state: "100",
      attributes: {
        friendly_name: "Battery energy",
        state_class: "total_increasing",
        unit_of_measurement: "kWh",
      },
    },
  ]);
  mockRecorder(hass);

  return hass;
};

const hourlyTemperatures = async () => {
  const statistics = await setup().callWS<Statistics>({
    type: "recorder/statistics_during_period",
    statistic_ids: ["sensor.outside_temperature"],
    start_time: "2026-11-25T00:00:00Z",
    end_time: "2026-11-26T00:00:00Z",
    period: "hour",
  });

  return statistics["sensor.outside_temperature"];
};

// Within the 10% the mock lets a value drift from its state
const expectAroundTwelve = (value: number | null | undefined) => {
  expect(value).toBeGreaterThanOrEqual(12 - 1.2);
  expect(value).toBeLessThanOrEqual(12 + 1.2);
};

describe("demo statistics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps means around the state, the same on every load", async () => {
    const temperatures = await hourlyTemperatures();
    const means = temperatures.map(({ mean }) => mean);

    expect(means).toHaveLength(24);
    expect(new Set(means).size).toBeGreaterThan(1);
    means.forEach(expectAroundTwelve);
    expect(await hourlyTemperatures()).toEqual(temperatures);
  });

  it("gives the metadata of each entity with its unit", async () => {
    expect(
      await setup().callWS<StatisticsMetaData[]>({
        type: "recorder/get_statistics_metadata",
        statistic_ids: [
          "sensor.outside_temperature",
          "sensor.battery_energy",
          "sensor.missing",
        ],
      })
    ).toMatchObject([
      {
        statistic_id: "sensor.outside_temperature",
        statistics_unit_of_measurement: "°C",
        has_sum: false,
        mean_type: StatisticMeanType.ARITHMETIC,
      },
      {
        statistic_id: "sensor.battery_energy",
        statistics_unit_of_measurement: "kWh",
        has_sum: true,
        mean_type: StatisticMeanType.NONE,
      },
    ]);
  });

  it("answers the statistic of today for a measurement", async () => {
    const statistic = await setup().callWS<Statistic>({
      type: "recorder/statistic_during_period",
      statistic_id: "sensor.outside_temperature",
      calendar: { period: "day" },
    });

    expectAroundTwelve(statistic.mean);
    expect(statistic.min).toBeLessThan(statistic.mean ?? 0);
    expect(statistic.max).toBeGreaterThan(statistic.mean ?? 0);
    expect(statistic.change).toBeNull();
  });

  it("answers a statistic over a period of many years", async () => {
    const statistic = await setup().callWS<Statistic>({
      type: "recorder/statistic_during_period",
      statistic_id: "sensor.outside_temperature",
      fixed_period: {
        start_time: "2000-01-01T00:00:00Z",
        end_time: "2026-11-26T00:00:00Z",
      },
    });

    expect(statistic.max).toBeGreaterThan(statistic.min ?? Infinity);
  });

  it("leaves out an hour that runs past the end, as Core does", async () => {
    const statisticUntil = (endTime: string) =>
      setup().callWS<Statistic>({
        type: "recorder/statistic_during_period",
        statistic_id: "sensor.battery_energy",
        fixed_period: {
          start_time: "2026-11-25T00:00:00Z",
          end_time: endTime,
        },
      });

    expect(await statisticUntil("2026-11-25T23:59:59.999Z")).toEqual(
      await statisticUntil("2026-11-25T23:00:00Z")
    );
  });

  it("places the energy tariffs from midnight for a rolling window", async () => {
    const hass = setup();

    // The demo's high tariff runs from 09:00 to 20:00, so from 06:00 to noon
    // it has the change of the hours from 09:00
    const statistic = await hass.callWS<Statistic>({
      type: "recorder/statistic_during_period",
      statistic_id: "sensor.energy_consumption_tarif_2",
      rolling_window: { duration: { hours: 6 } },
    });

    expect(statistic.change).toBeGreaterThan(0);
  });

  it("answers the change over a rolling window for a meter", async () => {
    const statistic = await setup().callWS<Statistic>({
      type: "recorder/statistic_during_period",
      statistic_id: "sensor.battery_energy",
      rolling_window: { duration: { hours: 6 } },
    });

    expect(statistic.change).toBeGreaterThan(0);
    expect(statistic.mean).toBeNull();
  });
});
