import { describe, expect, it } from "vitest";
import {
  isClientCondition,
  isLogicalCondition,
  isServerCondition,
  translateToCoreCondition,
} from "../../../src/common/condition/translate";
import type { VisibilityCondition } from "../../../src/panels/lovelace/common/validate-condition";

const cond = (c: any): VisibilityCondition => c as VisibilityCondition;

describe("isLogicalCondition", () => {
  it.each(["and", "or", "not"])("recognizes %s", (condition) => {
    expect(isLogicalCondition(cond({ condition }))).toBe(true);
  });

  it("rejects non-logical and legacy conditions", () => {
    expect(isLogicalCondition(cond({ condition: "state" }))).toBe(false);
    expect(isLogicalCondition(cond({ entity: "light.a", state: "on" }))).toBe(
      false
    );
  });
});

describe("isServerCondition / isClientCondition", () => {
  it("classifies stateful lovelace leaves as server", () => {
    for (const c of [
      { condition: "state", entity: "light.a", state: "on" },
      { condition: "numeric_state", entity: "sensor.a", above: 5 },
    ]) {
      expect(isServerCondition(cond(c))).toBe(true);
      expect(isClientCondition(cond(c))).toBe(false);
    }
  });

  it("classifies legacy { entity, state } conditions as server", () => {
    expect(isServerCondition(cond({ entity: "light.a", state: "on" }))).toBe(
      true
    );
  });

  it("classifies newly-available core leaves as server", () => {
    for (const c of [
      { condition: "template", value_template: "{{ true }}" },
      { condition: "sun", after: "sunset" },
      { condition: "zone", entity_id: "person.a", zone: "zone.home" },
      { condition: "device", device_id: "abc", domain: "light" },
      // integration-provided condition
      { condition: "my_integration.is_active" },
    ]) {
      expect(isServerCondition(cond(c))).toBe(true);
    }
  });

  it("classifies client-only leaves as client", () => {
    for (const c of [
      { condition: "screen", media_query: "(min-width: 600px)" },
      { condition: "user", users: ["u1"] },
      { condition: "view_columns", min: 2 },
      { condition: "location", locations: ["home"] },
      { condition: "time", after: "08:00" },
    ]) {
      expect(isClientCondition(cond(c))).toBe(true);
      expect(isServerCondition(cond(c))).toBe(false);
    }
  });

  it("treats a compound as server only when every descendant is server", () => {
    const allServer = cond({
      condition: "and",
      conditions: [
        { condition: "state", entity: "light.a", state: "on" },
        { condition: "template", value_template: "{{ true }}" },
      ],
    });
    expect(isServerCondition(allServer)).toBe(true);

    const mixed = cond({
      condition: "and",
      conditions: [
        { condition: "state", entity: "light.a", state: "on" },
        { condition: "screen", media_query: "(min-width: 600px)" },
      ],
    });
    expect(isServerCondition(mixed)).toBe(false);
    expect(isClientCondition(mixed)).toBe(true);
  });

  it("handles or / not and deep nesting", () => {
    expect(
      isServerCondition(
        cond({
          condition: "or",
          conditions: [
            { condition: "state", entity: "light.a", state: "on" },
            {
              condition: "not",
              conditions: [
                { condition: "numeric_state", entity: "sensor.a", above: 1 },
              ],
            },
          ],
        })
      )
    ).toBe(true);

    expect(
      isServerCondition(
        cond({
          condition: "or",
          conditions: [
            { condition: "state", entity: "light.a", state: "on" },
            {
              condition: "not",
              conditions: [{ condition: "user", users: ["u1"] }],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it("treats an empty compound as server (vacuously)", () => {
    expect(isServerCondition(cond({ condition: "and", conditions: [] }))).toBe(
      true
    );
    expect(isServerCondition(cond({ condition: "and" }))).toBe(true);
  });
});

describe("translateToCoreCondition", () => {
  describe("state", () => {
    it("renames entity → entity_id", () => {
      expect(
        translateToCoreCondition(
          cond({ condition: "state", entity: "light.a", state: "on" })
        )
      ).toEqual({ condition: "state", entity_id: "light.a", state: "on" });
    });

    it("keeps attribute and array state values", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "state",
            entity: "climate.a",
            attribute: "preset_mode",
            state: ["home", "away"],
          })
        )
      ).toEqual({
        condition: "state",
        entity_id: "climate.a",
        attribute: "preset_mode",
        state: ["home", "away"],
      });
    });

    it("wraps state_not in a not", () => {
      expect(
        translateToCoreCondition(
          cond({ condition: "state", entity: "light.a", state_not: "on" })
        )
      ).toEqual({
        condition: "not",
        conditions: [{ condition: "state", entity_id: "light.a", state: "on" }],
      });
    });

    it("wraps an array state_not in a single not", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "state",
            entity: "light.a",
            state_not: ["on", "unavailable"],
          })
        )
      ).toEqual({
        condition: "not",
        conditions: [
          {
            condition: "state",
            entity_id: "light.a",
            state: ["on", "unavailable"],
          },
        ],
      });
    });

    it("prefers state over state_not when both are present", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "state",
            entity: "light.a",
            state: "on",
            state_not: "off",
          })
        )
      ).toEqual({ condition: "state", entity_id: "light.a", state: "on" });
    });

    it("passes an entity-id comparison value through unchanged", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "state",
            entity: "light.a",
            state: "input_select.b",
          })
        )
      ).toEqual({
        condition: "state",
        entity_id: "light.a",
        state: "input_select.b",
      });
    });

    it("passes an already-core state condition through", () => {
      const core = {
        condition: "state",
        entity_id: "light.a",
        state: "on",
        for: { minutes: 5 },
      };
      expect(translateToCoreCondition(cond(core))).toEqual(core);
    });
  });

  describe("numeric_state", () => {
    it("renames entity → entity_id and keeps above/below/attribute", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            attribute: "battery",
            above: 10,
            below: 90,
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        attribute: "battery",
        above: 10,
        below: 90,
      });
    });

    it("coerces non-entity-id string bounds to numbers (core treats strings as entities)", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: "5",
            below: "10.5",
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: 5,
        below: 10.5,
      });
    });

    it("passes an entity-id reference bound through for core to resolve", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: "input_number.threshold",
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: "input_number.threshold",
      });
    });

    it("drops stray non-core fields rather than forwarding them", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: 5,
            bogus: "x",
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: 5,
      });
    });

    it("passes an already-core numeric_state condition through", () => {
      const core = {
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: "input_number.b",
      };
      expect(translateToCoreCondition(cond(core))).toEqual(core);
    });
  });

  describe("legacy conditions", () => {
    it("treats { entity, state } as a state condition", () => {
      expect(
        translateToCoreCondition(cond({ entity: "light.a", state: "on" }))
      ).toEqual({ condition: "state", entity_id: "light.a", state: "on" });
    });

    it("wraps legacy state_not in a not", () => {
      expect(
        translateToCoreCondition(cond({ entity: "light.a", state_not: "on" }))
      ).toEqual({
        condition: "not",
        conditions: [{ condition: "state", entity_id: "light.a", state: "on" }],
      });
    });
  });

  describe("passthrough types", () => {
    it.each([
      { condition: "template", value_template: "{{ is_state('a','on') }}" },
      { condition: "sun", after: "sunset", after_offset: -3600 },
      { condition: "zone", entity_id: "person.a", zone: "zone.home" },
      { condition: "device", device_id: "abc", domain: "light", type: "is_on" },
      { condition: "my_integration.is_active", target: { entity_id: "x.y" } },
    ])("passes $condition through unchanged", (c) => {
      expect(translateToCoreCondition(cond(c))).toEqual(c);
    });
  });

  describe("logical combinators", () => {
    it("translates and children recursively", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "and",
            conditions: [
              { condition: "state", entity: "light.a", state: "on" },
              { condition: "template", value_template: "{{ true }}" },
            ],
          })
        )
      ).toEqual({
        condition: "and",
        conditions: [
          { condition: "state", entity_id: "light.a", state: "on" },
          { condition: "template", value_template: "{{ true }}" },
        ],
      });
    });

    it("translates or children recursively", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "or",
            conditions: [
              { condition: "numeric_state", entity: "sensor.a", above: 5 },
            ],
          })
        )
      ).toEqual({
        condition: "or",
        conditions: [
          { condition: "numeric_state", entity_id: "sensor.a", above: 5 },
        ],
      });
    });

    it("keeps a single-child not as a plain not", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "not",
            conditions: [
              { condition: "state", entity: "light.a", state: "on" },
            ],
          })
        )
      ).toEqual({
        condition: "not",
        conditions: [{ condition: "state", entity_id: "light.a", state: "on" }],
      });
    });

    it("preserves ¬(AND) semantics for a multi-child not", () => {
      // Lovelace `not` is ¬(AND children); core `not` is ¬(OR children).
      // Wrapping in an `and` keeps the original meaning.
      expect(
        translateToCoreCondition(
          cond({
            condition: "not",
            conditions: [
              { condition: "state", entity: "light.a", state: "on" },
              { condition: "state", entity: "light.b", state: "on" },
            ],
          })
        )
      ).toEqual({
        condition: "not",
        conditions: [
          {
            condition: "and",
            conditions: [
              { condition: "state", entity_id: "light.a", state: "on" },
              { condition: "state", entity_id: "light.b", state: "on" },
            ],
          },
        ],
      });
    });

    it("handles a compound mixing lovelace and already-core children", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "and",
            conditions: [
              { condition: "state", entity: "light.a", state: "on" },
              { condition: "state", entity_id: "light.b", state: "off" },
              {
                condition: "or",
                conditions: [
                  { condition: "numeric_state", entity: "sensor.a", below: 3 },
                  { condition: "template", value_template: "{{ false }}" },
                ],
              },
            ],
          })
        )
      ).toEqual({
        condition: "and",
        conditions: [
          { condition: "state", entity_id: "light.a", state: "on" },
          { condition: "state", entity_id: "light.b", state: "off" },
          {
            condition: "or",
            conditions: [
              { condition: "numeric_state", entity_id: "sensor.a", below: 3 },
              { condition: "template", value_template: "{{ false }}" },
            ],
          },
        ],
      });
    });

    it("translates an empty not to false (¬AND of nothing), not core's true", () => {
      // checkConditionsMet: not([]) = !every([]) = !true = false.
      // A naive { condition: "not", conditions: [] } would be true in core.
      expect(
        translateToCoreCondition(cond({ condition: "not", conditions: [] }))
      ).toEqual({
        condition: "not",
        conditions: [{ condition: "and", conditions: [] }],
      });
    });

    it("translates empty and/or directly (already agree with core)", () => {
      expect(
        translateToCoreCondition(cond({ condition: "and", conditions: [] }))
      ).toEqual({ condition: "and", conditions: [] });
      expect(
        translateToCoreCondition(cond({ condition: "or", conditions: [] }))
      ).toEqual({ condition: "or", conditions: [] });
    });

    it("treats a logical condition with no conditions key as vacuously true", () => {
      for (const condition of ["and", "or", "not"]) {
        expect(translateToCoreCondition(cond({ condition }))).toEqual({
          condition: "and",
          conditions: [],
        });
      }
    });
  });

  describe("known limitations (documented, deferred)", () => {
    it("passes a non-input_* entity-id comparison value through unchanged", () => {
      // KNOWN LIMITATION: lovelace resolves any entity-id value to its live
      // state; core's `state` condition only dereferences `input_*` entities.
      // We pin the current passthrough behavior; a faithful fix would emit a
      // `template` condition (see translate.ts).
      expect(
        translateToCoreCondition(
          cond({ condition: "state", entity: "light.a", state: "sensor.b" })
        )
      ).toEqual({
        condition: "state",
        entity_id: "light.a",
        state: "sensor.b",
      });
    });
  });
});
