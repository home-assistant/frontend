import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import { showNumberSlider } from "../../src/data/number";

const makeStateObj = (attributes: Record<string, unknown>): HassEntity => ({
  entity_id: "number.test",
  state: "0",
  last_changed: "2024-01-01T00:00:00Z",
  last_updated: "2024-01-01T00:00:00Z",
  attributes: { min: 0, max: 100, step: 1, ...attributes },
  context: { id: "test", parent_id: null, user_id: null },
});

describe("showNumberSlider", () => {
  it("shows a slider in slider mode regardless of step count", () => {
    expect(
      showNumberSlider(
        makeStateObj({ mode: "slider", min: 0, max: 100000, step: 1 })
      )
    ).toBe(true);
  });

  it("shows a slider in auto mode when the step count is at or below the threshold", () => {
    expect(
      showNumberSlider(
        makeStateObj({ mode: "auto", min: 0, max: 256, step: 1 })
      )
    ).toBe(true);
    expect(
      showNumberSlider(
        makeStateObj({ mode: "auto", min: 0, max: 1000, step: 10 })
      )
    ).toBe(true);
  });

  it("shows a box in auto mode when the step count is above the threshold", () => {
    expect(
      showNumberSlider(
        makeStateObj({ mode: "auto", min: 0, max: 257, step: 1 })
      )
    ).toBe(false);
    expect(
      showNumberSlider(
        makeStateObj({ mode: "auto", min: 0, max: 100, step: 0.1 })
      )
    ).toBe(false);
  });

  it("shows a box for box mode", () => {
    expect(showNumberSlider(makeStateObj({ mode: "box" }))).toBe(false);
  });
});
