import { describe, expect, it } from "vitest";
import { evaluateConditionsLocally } from "../../../src/common/condition/evaluate-locally";
import type { VisibilityCondition } from "../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../src/types";

const cond = (c: any): VisibilityCondition => c as VisibilityCondition;

const hass = {
  states: {
    "light.on": { entity_id: "light.on", state: "on", attributes: {} },
    "sensor.temp": { entity_id: "sensor.temp", state: "21", attributes: {} },
  },
  user: { id: "user1" },
} as unknown as HomeAssistant;

const evaluate = (conditions: VisibilityCondition[]) =>
  evaluateConditionsLocally(conditions, hass, {});

// The mixin uses this as the optimistic seed while a `subscribe_condition`
// result is pending; anything it cannot evaluate exactly must stay unknown so
// a `not` around a server-only leaf is not inverted into a false "visible".
describe("evaluateConditionsLocally", () => {
  it("evaluates client-only and lovelace stateful leaves", () => {
    expect(evaluate([cond({ condition: "user", users: ["user1"] })])).toBe(
      true
    );
    expect(
      evaluate([cond({ condition: "state", entity: "light.on", state: "off" })])
    ).toBe(false);
    expect(evaluate([cond({ entity: "light.on", state: "on" })])).toBe(true);
    expect(
      evaluate([
        cond({ condition: "numeric_state", entity: "sensor.temp", above: 20 }),
      ])
    ).toBe(true);
  });

  it("evaluates a core state condition only within the locally supported subset", () => {
    expect(
      evaluate([
        cond({ condition: "state", entity_id: "light.on", state: "on" }),
      ])
    ).toBe(true);
    expect(
      evaluate([
        cond({
          condition: "state",
          entity_id: "light.on",
          state: "on",
          for: { minutes: 5 },
        }),
      ])
    ).toBeUndefined();
    expect(
      evaluate([
        cond({
          condition: "state",
          entity_id: ["light.on", "light.other"],
          state: "on",
        }),
      ])
    ).toBeUndefined();
    expect(
      evaluate([
        cond({
          condition: "numeric_state",
          entity_id: "sensor.temp",
          above: 20,
          value_template: "{{ state.state | float * 2 }}",
        }),
      ])
    ).toBeUndefined();
  });

  it("skips disabled nodes and leaves a template-valued enabled unknown", () => {
    // Core skips a disabled condition inside a compound (it neither passes nor
    // fails); the legacy evaluator ignores `enabled`, so without this a
    // `not: [disabled failing state, ...]` would be seeded visible while core
    // reports hidden.
    expect(
      evaluate([
        cond({
          condition: "state",
          entity_id: "light.on",
          state: "off",
          enabled: false,
        }),
      ])
    ).toBe(true);
    expect(
      evaluate([
        cond({
          condition: "not",
          conditions: [
            { entity: "light.on", state: "off", enabled: false },
            { entity: "light.on", state: "on" },
          ],
        }),
      ])
    ).toBe(false);
    expect(
      evaluate([
        cond({
          condition: "and",
          enabled: "{{ false }}",
          conditions: [{ entity: "light.on", state: "on" }],
        }),
      ])
    ).toBeUndefined();
    // an explicitly enabled node is evaluated normally, not left unknown
    expect(
      evaluate([
        cond({
          condition: "state",
          entity_id: "light.on",
          state: "on",
          enabled: true,
        }),
      ])
    ).toBe(true);
  });

  it("treats core-only leaves as unknown", () => {
    expect(
      evaluate([cond({ condition: "template", value_template: "{{ true }}" })])
    ).toBeUndefined();
    expect(evaluate([cond({ condition: "sun", after: "sunset" })])).toBe(
      undefined
    );
  });

  it("does not invert an unknown leaf under not", () => {
    expect(
      evaluate([
        cond({
          condition: "not",
          conditions: [{ condition: "template", value_template: "{{ x }}" }],
        }),
      ])
    ).toBeUndefined();
  });

  it("lets a decided sibling short-circuit an unknown one", () => {
    const template = { condition: "template", value_template: "{{ x }}" };
    expect(
      evaluate([
        cond({
          condition: "or",
          conditions: [{ entity: "light.on", state: "on" }, template],
        }),
      ])
    ).toBe(true);
    expect(
      evaluate([
        cond({
          condition: "and",
          conditions: [{ entity: "light.on", state: "off" }, template],
        }),
      ])
    ).toBe(false);
    // ¬(AND) with a false child is decided regardless of the unknown one
    expect(
      evaluate([
        cond({
          condition: "not",
          conditions: [{ entity: "light.on", state: "off" }, template],
        }),
      ])
    ).toBe(true);
  });

  it("stays unknown when the outcome depends on an unknown sibling", () => {
    const template = { condition: "template", value_template: "{{ x }}" };
    expect(
      evaluate([
        cond({
          condition: "and",
          conditions: [{ entity: "light.on", state: "on" }, template],
        }),
      ])
    ).toBeUndefined();
    expect(
      evaluate([cond({ entity: "light.on", state: "on" }), cond(template)])
    ).toBeUndefined();
  });

  it("treats a logical condition with no conditions key as true", () => {
    expect(evaluate([cond({ condition: "or" })])).toBe(true);
    expect(evaluate([cond({ condition: "not" })])).toBe(true);
  });
});
