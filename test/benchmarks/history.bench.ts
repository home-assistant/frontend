import { bench, describe } from "vitest";
import { computeHistory } from "../../src/data/history";
import {
  generateMixedHistory,
  generateNumericSensorStates,
} from "../fixtures/history-states";
import { createMockHass, mockLocalize } from "../fixtures/hass";
import type { HistoryStates } from "../../src/data/history";

const SENSOR_NUMERIC_DEVICE_CLASSES = ["power", "energy", "temperature"];
const hass = createMockHass();

const medium = generateMixedHistory(1, "medium");
const large = generateMixedHistory(2, "large");
const singleDense: HistoryStates = {
  "sensor.power_meter": generateNumericSensorStates(3, { count: 100_000 }),
};
const manyEntities: HistoryStates = {};
for (let i = 0; i < 20; i++) {
  manyEntities[`sensor.power_${i}`] = generateNumericSensorStates(100 + i, {
    count: 5_000,
  });
}

describe("computeHistory", () => {
  bench("mixed medium (10k states)", () => {
    computeHistory(hass, medium, [], mockLocalize, [
      ...SENSOR_NUMERIC_DEVICE_CLASSES,
    ]);
  });

  bench(
    "mixed large (100k states)",
    () => {
      computeHistory(hass, large, [], mockLocalize, [
        ...SENSOR_NUMERIC_DEVICE_CLASSES,
      ]);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "mixed large with splitDeviceClasses (100k states)",
    () => {
      computeHistory(
        hass,
        large,
        [],
        mockLocalize,
        [...SENSOR_NUMERIC_DEVICE_CLASSES],
        true
      );
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "single dense sensor (100k states)",
    () => {
      computeHistory(hass, singleDense, [], mockLocalize, [
        ...SENSOR_NUMERIC_DEVICE_CLASSES,
      ]);
    },
    { time: 1000, warmupIterations: 2 }
  );

  bench(
    "many entities (20 x 5k states)",
    () => {
      computeHistory(hass, manyEntities, [], mockLocalize, [
        ...SENSOR_NUMERIC_DEVICE_CLASSES,
      ]);
    },
    { time: 1000, warmupIterations: 2 }
  );
});
