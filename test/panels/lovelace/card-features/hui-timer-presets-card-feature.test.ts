import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { FrontendLocaleData } from "../../../../src/data/translation";
import {
  computeTimerPresets,
  supportsTimerPresetsCardFeature,
} from "../../../../src/panels/lovelace/card-features/hui-timer-presets-card-feature";
import type { HomeAssistant } from "../../../../src/types";

const entity = (entityId: string): HassEntity =>
  ({
    entity_id: entityId,
    state: "idle",
    attributes: {},
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const hassWith = (...entities: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
  }) as unknown as HomeAssistant;

const locale = { language: "en" } as FrontendLocaleData;

describe("supportsTimerPresetsCardFeature", () => {
  it("supports a timer entity", () => {
    const stateObj = entity("timer.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTimerPresetsCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("does not support other domains", () => {
    const stateObj = entity("switch.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTimerPresetsCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsTimerPresetsCardFeature(hass, {})).toBe(false);
  });
});

describe("computeTimerPresets", () => {
  it("formats string presets", () => {
    expect(computeTimerPresets(["0:05:00", "1:00:00"], locale)).toEqual([
      { duration: 300, label: "5:00" },
      { duration: 3600, label: "1:00:00" },
    ]);
  });

  it("labels numeric presets the same as their string form", () => {
    expect(computeTimerPresets([90, "0:01:30"], locale)).toEqual([
      { duration: 90, label: "1:30" },
      { duration: 90, label: "1:30" },
    ]);
    expect(computeTimerPresets([3600], locale)).toEqual([
      { duration: 3600, label: "1:00:00" },
    ]);
    expect(computeTimerPresets([45, "0:00:45"], locale)).toEqual([
      { duration: 45, label: "45 seconds" },
      { duration: 45, label: "45 seconds" },
    ]);
  });

  it("drops zero and unparseable presets", () => {
    expect(
      computeTimerPresets(["0:00:00", 0, "1:2:3:4", "0:10:00"], locale)
    ).toEqual([{ duration: 600, label: "10:00" }]);
  });

  it("sends the normalized duration for lenient parsed presets", () => {
    // createDurationData coerces invalid segments to 0 like the automation
    // editor does. The normalized seconds must be what is sent to timer.start,
    // never the raw malformed string.
    expect(computeTimerPresets(["1:nope:00"], locale)).toEqual([
      { duration: 3600, label: "1:00:00" },
    ]);
  });
});
