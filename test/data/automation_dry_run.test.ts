import { describe, expect, it } from "vitest";
import type { AutomationConfig } from "../../src/data/automation";
import {
  conditionAtPath,
  dryRunDetailLines,
  triggerAtIndex,
} from "../../src/data/automation_dry_run";

const CONFIG = {
  triggers: [
    { trigger: "state", entity_id: "light.kitchen", to: "on" },
    { trigger: "event", event_type: "test" },
  ],
  conditions: [
    "{{ is_state('light.kitchen', 'on') }}",
    {
      condition: "or",
      conditions: [
        { condition: "state", entity_id: "light.a", state: "on" },
        { and: [{ condition: "state", entity_id: "light.b", state: "on" }] },
      ],
    },
  ],
  actions: [],
} as unknown as AutomationConfig;

describe("conditionAtPath", () => {
  it.each([
    ["condition/0", "{{ is_state('light.kitchen', 'on') }}"],
    [
      "condition/1/conditions/0",
      { condition: "state", entity_id: "light.a", state: "on" },
    ],
    [
      "condition/1/conditions/1/conditions/0",
      { condition: "state", entity_id: "light.b", state: "on" },
    ],
    ["condition/5", undefined],
    ["condition/0/conditions/0", undefined],
    ["trigger/0", undefined],
  ])("resolves %s", (path, expected) => {
    expect(conditionAtPath(CONFIG, path)).toEqual(expected);
  });

  it("handles a config without conditions", () => {
    expect(
      conditionAtPath({ triggers: [], actions: [] }, "condition/0")
    ).toBeUndefined();
  });
});

describe("triggerAtIndex", () => {
  it("finds the trigger by index", () => {
    expect(triggerAtIndex(CONFIG, "1")).toEqual({
      trigger: "event",
      event_type: "test",
    });
  });
});

describe("dryRunDetailLines", () => {
  it("returns nothing without details", () => {
    expect(dryRunDetailLines("state", undefined, undefined)).toEqual([]);
  });

  it("names the entity of a state sub result", () => {
    expect(
      dryRunDetailLines(
        "state",
        {
          sub_results: {
            "entity_id/0": { result: true, state: "on", wanted_state: "on" },
            "entity_id/1": { result: false, state: "off", wanted_state: "on" },
          },
        },
        {
          condition: "state",
          entity_id: ["light.a", "light.b"],
          state: "on",
        }
      )
    ).toEqual([
      {
        type: "state",
        ok: true,
        entityId: "light.a",
        actual: "on",
        wanted: "on",
      },
      {
        type: "state",
        ok: false,
        entityId: "light.b",
        actual: "off",
        wanted: "on",
      },
    ]);
  });

  it("explains a state that has not lasted long enough", () => {
    expect(
      dryRunDetailLines(
        "state",
        {
          sub_results: {
            "entity_id/0": {
              result: false,
              state: "on",
              duration: "2026-11-05T08:55:00+00:00",
            },
          },
        },
        { trigger: "state", entity_id: "light.kitchen", to: "on" }
      )
    ).toEqual([
      {
        type: "state_since",
        ok: false,
        entityId: "light.kitchen",
        actual: "on",
        since: "2026-11-05T08:55:00+00:00",
      },
    ]);
  });

  it.each([
    {
      name: "failing check reports the bound",
      sub: { result: false, state: 21.5, wanted_state_above: 25 },
      config: { above: 25, below: 30 },
      expected: { ok: false, above: 25, below: 30 },
    },
    {
      name: "passing check takes the range from the config",
      sub: { result: true, state: 21.5 },
      config: { above: 20 },
      expected: { ok: true, above: 20, below: undefined },
    },
    {
      name: "a template or entity bound is left out",
      sub: { result: true, state: 21.5 },
      config: { above: "input_number.min" },
      expected: { ok: true, above: undefined, below: undefined },
    },
  ])("numeric state: $name", ({ sub, config, expected }) => {
    expect(
      dryRunDetailLines(
        "numeric_state",
        { sub_results: { "entity_id/0": sub } },
        {
          condition: "numeric_state",
          entity_id: "sensor.temperature",
          ...config,
        }
      )
    ).toEqual([
      {
        type: "numeric",
        entityId: "sensor.temperature",
        actual: 21.5,
        ...expected,
      },
    ]);
  });

  it("passes a sub result message through", () => {
    expect(
      dryRunDetailLines(
        "state",
        {
          sub_results: {
            "entity_id/0": {
              result: false,
              message: "attribute 'x' of entity light.a does not exist",
            },
          },
        },
        undefined
      )
    ).toEqual([
      {
        type: "message",
        message: "attribute 'x' of entity light.a does not exist",
      },
    ]);
  });

  it("explains time, weekday and template details", () => {
    expect(
      dryRunDetailLines(
        "time",
        {
          after: "08:00:00",
          before: "10:00:00",
          now_time: "10:10:00.214260",
          weekday: "mon",
          now_weekday: "thu",
          entities: ["sensor.a"],
        },
        undefined
      )
    ).toEqual([
      { type: "time", now: "10:10", after: "08:00", before: "10:00" },
      { type: "weekday", now: "thu", wanted: ["mon"] },
      { type: "template_entities", entities: ["sensor.a"] },
    ]);
  });
});
