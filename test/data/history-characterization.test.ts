/**
 * Characterization tests pinning the exact current output of the history
 * data-processing pipeline. These exist so performance optimizations can be
 * verified to leave behavior bit-identical — see test/benchmarks/README.md.
 *
 * Do NOT update these snapshots to make an optimization pass; an output
 * change is a behavior change and must be escalated instead.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HistoryStream,
  computeHistory,
  convertStatisticsToHistory,
  mergeHistoryResults,
} from "../../src/data/history";
import { digestResult } from "../fixtures/digest";
import {
  FIXED_EPOCH_MS,
  generateBinarySensorStates,
  generateClimateStates,
  generateMixedHistory,
  generateNumericSensorStates,
} from "../fixtures/history-states";
import {
  createMockEntityState,
  createMockHass,
  mockLocalize,
} from "../fixtures/hass";
import { generateStatistics } from "../fixtures/statistics";

const SENSOR_NUMERIC_DEVICE_CLASSES = ["power", "energy", "temperature"];

const buildTinyHistory = () => ({
  "sensor.power_meter": generateNumericSensorStates(1, { count: 40 }),
  "binary_sensor.motion_hall": generateBinarySensorStates(2, { count: 30 }),
  "climate.thermostat": generateClimateStates(3, { count: 30 }),
});

describe("computeHistory characterization", () => {
  const hass = createMockHass({
    "sensor.power_meter": createMockEntityState("sensor.power_meter", "150.0", {
      unit_of_measurement: "W",
      device_class: "power",
      state_class: "measurement",
      friendly_name: "Power meter",
    }),
    "climate.thermostat": createMockEntityState("climate.thermostat", "heat", {
      friendly_name: "Thermostat",
      current_temperature: 21,
      temperature: 21,
    }),
  });

  it("matches snapshot for a mixed payload", () => {
    expect(
      computeHistory(
        hass,
        buildTinyHistory(),
        [],
        mockLocalize,
        SENSOR_NUMERIC_DEVICE_CLASSES
      )
    ).toMatchSnapshot();
  });

  it("matches snapshot with splitDeviceClasses enabled", () => {
    expect(
      computeHistory(
        hass,
        buildTinyHistory(),
        [],
        mockLocalize,
        SENSOR_NUMERIC_DEVICE_CLASSES,
        true
      )
    ).toMatchSnapshot();
  });

  it("matches snapshot with forceNumeric enabled", () => {
    expect(
      computeHistory(
        hass,
        buildTinyHistory(),
        [],
        mockLocalize,
        SENSOR_NUMERIC_DEVICE_CLASSES,
        false,
        true
      )
    ).toMatchSnapshot();
  });

  it("falls back to current state for entities without history", () => {
    expect(
      computeHistory(
        hass,
        {},
        ["sensor.power_meter", "sensor.not_present"],
        mockLocalize,
        SENSOR_NUMERIC_DEVICE_CLASSES
      )
    ).toMatchSnapshot();
  });

  it("large mixed payload digest is stable", () => {
    expect(
      digestResult(
        computeHistory(
          hass,
          generateMixedHistory(42, "large"),
          [],
          mockLocalize,
          SENSOR_NUMERIC_DEVICE_CLASSES
        )
      )
    ).toMatchSnapshot();
  });

  it("resolves non-numeric domain units (zone, humidifier, water_heater)", () => {
    // Pins the per-domain unit lookup for non-numeric line entities, which the
    // mixed/climate fixtures above do not exercise.
    const history = {
      "zone.home": [
        { s: "2", a: { friendly_name: "Home zone" }, lu: 1_700_000_000 },
        { s: "3", a: {}, lu: 1_700_000_060 },
      ],
      "humidifier.bedroom": [
        {
          s: "on",
          a: {
            friendly_name: "Bedroom humidifier",
            humidity: 45,
            mode: "auto",
          },
          lu: 1_700_000_000,
        },
        { s: "on", a: { humidity: 50, mode: "auto" }, lu: 1_700_000_060 },
      ],
      "water_heater.tank": [
        {
          s: "eco",
          a: {
            friendly_name: "Water heater",
            temperature: 50,
            current_temperature: 48,
          },
          lu: 1_700_000_000,
        },
        {
          s: "eco",
          a: { temperature: 55, current_temperature: 49 },
          lu: 1_700_000_060,
        },
      ],
    };
    expect(
      computeHistory(
        hass,
        history,
        [],
        mockLocalize,
        SENSOR_NUMERIC_DEVICE_CLASSES
      )
    ).toMatchSnapshot();
  });
});

describe("HistoryStream characterization", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("merges an incremental message and purges expired states", () => {
    const nowMs = FIXED_EPOCH_MS + 24 * 60 * 60 * 1000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);

    const hoursToShow = 2;
    const stream = new HistoryStream(createMockHass(), hoursToShow);
    const windowStartMs = nowMs - hoursToShow * 60 * 60 * 1000;

    // Initial chunk: 1 hour of data starting just inside the window,
    // plus older states that should be purged on the next message.
    const initial = stream.processMessage({
      states: {
        "sensor.power_meter": generateNumericSensorStates(7, {
          count: 200,
          startMs: windowStartMs - 30 * 60 * 1000,
          intervalMs: 60 * 1000,
          jitter: 0,
        }),
      },
    });
    expect(digestResult(initial)).toMatchSnapshot("initial");

    // Incremental update with recent states
    const incremental = stream.processMessage({
      states: {
        "sensor.power_meter": generateNumericSensorStates(8, {
          count: 10,
          startMs: nowMs - 5 * 60 * 1000,
          intervalMs: 30 * 1000,
          jitter: 0,
        }),
      },
    });
    expect(incremental).toMatchSnapshot("incremental");
  });

  it("handles multiple entities", () => {
    const nowMs = FIXED_EPOCH_MS + 24 * 60 * 60 * 1000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);

    const stream = new HistoryStream(createMockHass(), 1);
    const result = stream.processMessage({
      states: {
        "sensor.power_meter": generateNumericSensorStates(9, {
          count: 30,
          startMs: nowMs - 30 * 60 * 1000,
          intervalMs: 60 * 1000,
          jitter: 0,
        }),
        "binary_sensor.motion_hall": generateBinarySensorStates(10, {
          count: 20,
          startMs: nowMs - 30 * 60 * 1000,
          intervalMs: 90 * 1000,
          jitter: 0,
        }),
      },
    });
    expect(result).toMatchSnapshot();
  });

  it("adds a new entity, keeps an absent one, and sorts out-of-order states", () => {
    const nowMs = FIXED_EPOCH_MS + 24 * 60 * 60 * 1000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);

    const hoursToShow = 2;
    const stream = new HistoryStream(createMockHass(), hoursToShow);
    const windowStartMs = nowMs - hoursToShow * 60 * 60 * 1000;

    // Initial chunk with two entities.
    const initial = stream.processMessage({
      states: {
        "sensor.power_a": generateNumericSensorStates(21, {
          count: 60,
          startMs: windowStartMs + 5 * 60 * 1000,
          intervalMs: 60 * 1000,
          jitter: 0,
        }),
        "sensor.power_b": generateNumericSensorStates(22, {
          count: 60,
          startMs: windowStartMs + 5 * 60 * 1000,
          intervalMs: 60 * 1000,
          jitter: 0,
        }),
      },
    });
    expect(digestResult(initial)).toMatchSnapshot("multi-initial");

    // Incremental update that:
    //  - updates only sensor.power_a (sensor.power_b is absent and must be kept)
    //  - introduces a brand-new entity sensor.power_c (stream-only branch)
    //  - delivers sensor.power_a states out of order (older lu than the last
    //    combined state) to exercise the sort path
    const incremental = stream.processMessage({
      states: {
        "sensor.power_a": generateNumericSensorStates(23, {
          count: 10,
          startMs: nowMs - 90 * 60 * 1000,
          intervalMs: 30 * 1000,
          jitter: 0,
        }),
        "sensor.power_c": generateNumericSensorStates(24, {
          count: 15,
          startMs: nowMs - 10 * 60 * 1000,
          intervalMs: 30 * 1000,
          jitter: 0,
        }),
      },
    });
    expect(incremental).toMatchSnapshot("multi-incremental");
  });
});

describe("convertStatisticsToHistory characterization", () => {
  const hass = createMockHass();

  it("converts mean-based statistics", () => {
    const statistics = generateStatistics(11, {
      ids: ["sensor.temperature_indoor"],
      period: "hour",
      days: 2,
    });
    expect(
      convertStatisticsToHistory(
        hass,
        statistics,
        ["sensor.temperature_indoor"],
        SENSOR_NUMERIC_DEVICE_CLASSES
      )
    ).toMatchSnapshot();
  });

  it("converts sum-based statistics and respects id ordering", () => {
    const statistics = generateStatistics(12, {
      ids: ["sensor.energy_a", "sensor.energy_b"],
      period: "hour",
      days: 1,
      sumStatistics: true,
    });
    expect(
      convertStatisticsToHistory(
        hass,
        statistics,
        ["sensor.energy_b", "sensor.energy_a"],
        SENSOR_NUMERIC_DEVICE_CLASSES,
        true
      )
    ).toMatchSnapshot();
  });
});

describe("mergeHistoryResults characterization", () => {
  it("merges recent history with long-term statistics", () => {
    const hass = createMockHass();

    const dayMs = 24 * 60 * 60 * 1000;
    const ltsResult = convertStatisticsToHistory(
      hass,
      generateStatistics(13, {
        ids: ["sensor.power_meter"],
        period: "hour",
        days: 2,
      }),
      ["sensor.power_meter"],
      SENSOR_NUMERIC_DEVICE_CLASSES
    );
    const historyResult = computeHistory(
      hass,
      {
        "sensor.power_meter": generateNumericSensorStates(14, {
          count: 50,
          startMs: FIXED_EPOCH_MS + 2 * dayMs,
        }),
      },
      [],
      mockLocalize,
      SENSOR_NUMERIC_DEVICE_CLASSES
    );

    expect(mergeHistoryResults(historyResult, ltsResult)).toMatchSnapshot();
    expect(mergeHistoryResults(historyResult, undefined)).toBe(historyResult);
  });
});
