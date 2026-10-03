/**
 * Deterministic generators for the `HistoryStates` wire format consumed by
 * `computeHistory` and `HistoryStream` (src/data/history.ts).
 *
 * Timestamps (`lu`/`lc`) are python time in SECONDS, matching the websocket
 * API. Unless stated otherwise, fixtures are anchored at FIXED_EPOCH_MS so
 * outputs are stable across runs; HistoryStream scenarios must instead anchor
 * relative to the (possibly faked) current time via the `startMs` option.
 */
import type { EntityHistoryState, HistoryStates } from "../../src/data/history";
import { createSeededRandom } from "./random";

export const FIXED_EPOCH_MS = Date.UTC(2024, 0, 1, 0, 0, 0);

export const SCALES = {
  small: 1_000,
  medium: 10_000,
  large: 100_000,
} as const;

export type ScaleName = keyof typeof SCALES;

interface GeneratorOptions {
  /** Number of states to generate */
  count: number;
  /** Timestamp of the first state, in milliseconds */
  startMs?: number;
  /** Base interval between states, in milliseconds */
  intervalMs?: number;
  /** Random jitter applied to each interval, 0..1 fraction of intervalMs */
  jitter?: number;
}

const resolveOptions = (options: GeneratorOptions) => ({
  startMs: FIXED_EPOCH_MS,
  intervalMs: 30_000,
  jitter: 0.2,
  ...options,
});

/**
 * Random-walk numeric sensor history. Includes repeated values (so some
 * states carry `lc` distinct from `lu`) and occasional unavailable/unknown
 * states to exercise sanitization paths.
 */
export const generateNumericSensorStates = (
  seed: number,
  options: GeneratorOptions,
  attributes: Record<string, any> = {
    unit_of_measurement: "W",
    device_class: "power",
    state_class: "measurement",
  }
): EntityHistoryState[] => {
  const { count, startMs, intervalMs, jitter } = resolveOptions(options);
  const random = createSeededRandom(seed);
  const states: EntityHistoryState[] = [];
  let value = 100 + random() * 100;
  let timeMs = startMs;
  let lastChangedMs = startMs;

  for (let i = 0; i < count; i++) {
    const roll = random();
    let s: string;
    if (roll < 0.005) {
      s = "unavailable";
    } else if (roll < 0.0075) {
      s = "unknown";
    } else if (roll < 0.15 && states.length > 0) {
      // Repeat the previous value: lu advances, lc stays
      s = states[states.length - 1].s;
    } else {
      value = Math.max(0, value + (random() - 0.5) * 20);
      s = value.toFixed(2);
    }

    const changed = states.length === 0 || s !== states[states.length - 1].s;
    if (changed) {
      lastChangedMs = timeMs;
    }
    const state: EntityHistoryState = {
      s,
      a: i === 0 ? attributes : {},
      lu: timeMs / 1000,
    };
    if (!changed) {
      state.lc = lastChangedMs / 1000;
    }
    states.push(state);

    timeMs += intervalMs * (1 + (random() - 0.5) * 2 * jitter);
  }
  return states;
};

/** On/off binary sensor history (becomes a timeline entity). */
export const generateBinarySensorStates = (
  seed: number,
  options: GeneratorOptions
): EntityHistoryState[] => {
  const { count, startMs, intervalMs, jitter } = resolveOptions(options);
  const random = createSeededRandom(seed);
  const states: EntityHistoryState[] = [];
  let on = random() > 0.5;
  let timeMs = startMs;

  for (let i = 0; i < count; i++) {
    on = random() < 0.4 ? !on : on;
    states.push({
      s: on ? "on" : "off",
      a: i === 0 ? { device_class: "motion" } : {},
      lu: timeMs / 1000,
    });
    timeMs += intervalMs * (1 + (random() - 0.5) * 2 * jitter);
  }
  return states;
};

/**
 * Climate entity history with churning attributes; exercises the
 * attribute-keeping path (LINE_ATTRIBUTES_TO_KEEP) and the line+timeline
 * split for climate domains.
 */
export const generateClimateStates = (
  seed: number,
  options: GeneratorOptions
): EntityHistoryState[] => {
  const { count, startMs, intervalMs, jitter } = resolveOptions(options);
  const random = createSeededRandom(seed);
  const states: EntityHistoryState[] = [];
  const modes = ["heat", "cool", "off"] as const;
  let mode: (typeof modes)[number] = "heat";
  let current = 19 + random() * 4;
  let target = 21;
  let timeMs = startMs;

  for (let i = 0; i < count; i++) {
    if (random() < 0.05) {
      mode = modes[Math.floor(random() * modes.length)];
    }
    if (random() < 0.1) {
      target = 18 + Math.floor(random() * 6);
    }
    current += (random() - 0.5) * 0.6;
    states.push({
      s: mode,
      a: {
        temperature: target,
        current_temperature: Number(current.toFixed(1)),
        hvac_action:
          mode === "off" ? "off" : random() > 0.5 ? "heating" : "idle",
      },
      lu: timeMs / 1000,
    });
    timeMs += intervalMs * (1 + (random() - 0.5) * 2 * jitter);
  }
  return states;
};

/**
 * Multi-entity payload approximating a real history subscription:
 * numeric sensors, binary sensors, and one climate entity. The scale is the
 * approximate TOTAL number of states across all entities.
 */
export const generateMixedHistory = (
  seed: number,
  scale: ScaleName,
  startMs = FIXED_EPOCH_MS
): HistoryStates => {
  const total = SCALES[scale];
  const numericSensors = 4;
  const binarySensors = 2;
  const perEntity = Math.floor(total / (numericSensors + binarySensors + 1));
  const history: HistoryStates = {};

  for (let i = 0; i < numericSensors; i++) {
    history[`sensor.power_${i}`] = generateNumericSensorStates(seed + i, {
      count: perEntity,
      startMs,
    });
  }
  for (let i = 0; i < binarySensors; i++) {
    history[`binary_sensor.motion_${i}`] = generateBinarySensorStates(
      seed + 100 + i,
      { count: perEntity, startMs }
    );
  }
  history["climate.thermostat"] = generateClimateStates(seed + 200, {
    count: perEntity,
    startMs,
  });
  return history;
};
