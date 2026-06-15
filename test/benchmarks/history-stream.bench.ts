import { bench, describe } from "vitest";
import { HistoryStream } from "../../src/data/history";
import type { HistoryStreamMessage } from "../../src/data/history";
import { generateNumericSensorStates } from "../fixtures/history-states";
import { createMockHass } from "../fixtures/hass";

// HistoryStream purges against the real clock, so these fixtures are
// anchored relative to Date.now() at module load (never use fake timers in
// benchmarks — tinybench needs the real clock).
const hass = createMockHass();
const HOURS_TO_SHOW = 24;
const nowMs = Date.now();
const windowStartMs = nowMs - HOURS_TO_SHOW * 60 * 60 * 1000;

// Initial chunk: a day of data for several entities, partially before the
// purge window so every message triggers purge work.
const buildInitialMessage = (): HistoryStreamMessage => {
  const states = {};
  for (let i = 0; i < 5; i++) {
    states[`sensor.power_${i}`] = generateNumericSensorStates(i, {
      count: 5_000,
      startMs: windowStartMs - 60 * 60 * 1000,
      intervalMs: (HOURS_TO_SHOW * 60 * 60 * 1000) / 5_000,
      jitter: 0,
    });
  }
  return { states };
};

const initialMessage = buildInitialMessage();

// Pre-built incremental updates appended near "now"
const incrementalMessages: HistoryStreamMessage[] = [];
for (let i = 0; i < 20; i++) {
  const states = {};
  for (let e = 0; e < 5; e++) {
    states[`sensor.power_${e}`] = generateNumericSensorStates(
      1000 + i * 5 + e,
      {
        count: 10,
        startMs: nowMs - (20 - i) * 60 * 1000,
        intervalMs: 5_000,
        jitter: 0,
      }
    );
  }
  incrementalMessages.push({ states });
}

describe("HistoryStream.processMessage", () => {
  bench(
    "initial chunk + 20 incremental updates (5 entities, 25k states)",
    () => {
      const stream = new HistoryStream(hass, HOURS_TO_SHOW);
      stream.processMessage(initialMessage);
      for (const message of incrementalMessages) {
        stream.processMessage(message);
      }
    },
    { time: 1000, warmupIterations: 2 }
  );
});
