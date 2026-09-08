import { describe, expect, it } from "vitest";
import {
  isClientCondition,
  isLogicalCondition,
  isPureClientCondition,
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

  it("keeps lovelace leaves with legacy-only semantics client-side", () => {
    // Core compares raw attribute values, only dereferences input_* comparison
    // values and errors on a missing bound entity, where lovelace stringifies,
    // resolves any entity and ignores the bound. Existing dashboards must not
    // change, so such leaves stay locally evaluated until the user edits them.
    for (const c of [
      {
        condition: "state",
        entity: "light.a",
        attribute: "brightness",
        state: "255",
      },
      { condition: "state", entity: "light.a", state: "sensor.b" },
      { condition: "state", entity: "light.a", state_not: ["on", "sensor.b"] },
      { entity: "light.a", state: "sensor.b" },
      {
        condition: "numeric_state",
        entity: "sensor.a",
        above: "input_number.b",
      },
    ]) {
      expect(isServerCondition(cond(c))).toBe(false);
      expect(isClientCondition(cond(c))).toBe(true);
    }
    // numeric literals are not entity references, and core-format leaves are
    // core's to evaluate
    for (const c of [
      { condition: "state", entity: "sensor.a", state: "21.5" },
      { condition: "numeric_state", entity: "sensor.a", above: "21.5" },
      {
        condition: "numeric_state",
        entity: "sensor.a",
        attribute: "x",
        above: 1,
      },
      {
        condition: "state",
        entity_id: "light.a",
        attribute: "brightness",
        state: 255,
      },
      {
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: "input_number.b",
      },
    ]) {
      expect(isServerCondition(cond(c))).toBe(true);
    }
  });

  it("accepts a single condition as the children of a logical condition", () => {
    // Core's LogicalCondition allows `conditions` to be one condition or a list.
    expect(
      isServerCondition(
        cond({
          condition: "and",
          conditions: { entity: "light.a", state: "on" },
        })
      )
    ).toBe(true);
    expect(
      isPureClientCondition(
        cond({
          condition: "not",
          conditions: { condition: "user", users: ["u"] },
        })
      )
    ).toBe(true);
    expect(
      translateToCoreCondition(
        cond({
          condition: "or",
          conditions: { entity: "light.a", state: "on" },
        })
      )
    ).toEqual({
      condition: "or",
      conditions: [{ condition: "state", entity_id: "light.a", state: "on" }],
    });
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

describe("isPureClientCondition", () => {
  it("is true for a client-only leaf, false for a server leaf", () => {
    expect(
      isPureClientCondition(cond({ condition: "user", users: ["u1"] }))
    ).toBe(true);
    expect(
      isPureClientCondition(
        cond({ condition: "state", entity: "light.a", state: "on" })
      )
    ).toBe(false);
  });

  it("treats legacy { entity, state } conditions as not pure-client", () => {
    expect(
      isPureClientCondition(cond({ entity: "light.a", state: "on" }))
    ).toBe(false);
  });

  it("is true only when every descendant is client", () => {
    const allClient = cond({
      condition: "and",
      conditions: [
        { condition: "screen", media_query: "(min-width: 600px)" },
        { condition: "user", users: ["u1"] },
      ],
    });
    expect(isPureClientCondition(allClient)).toBe(true);

    // A mixed tree is neither pure-server nor pure-client.
    const mixed = cond({
      condition: "and",
      conditions: [
        { condition: "state", entity: "light.a", state: "on" },
        { condition: "screen", media_query: "(min-width: 600px)" },
      ],
    });
    expect(isPureClientCondition(mixed)).toBe(false);
    expect(isServerCondition(mixed)).toBe(false);
    expect(isClientCondition(mixed)).toBe(true);
  });

  it("handles deep nesting and empty compounds", () => {
    expect(
      isPureClientCondition(
        cond({
          condition: "or",
          conditions: [
            { condition: "time", after: "08:00" },
            {
              condition: "not",
              conditions: [{ condition: "user", users: ["u1"] }],
            },
          ],
        })
      )
    ).toBe(true);

    expect(
      isPureClientCondition(
        cond({
          condition: "or",
          conditions: [
            { condition: "time", after: "08:00" },
            {
              condition: "not",
              conditions: [
                { condition: "numeric_state", entity: "sensor.a", above: 1 },
              ],
            },
          ],
        })
      )
    ).toBe(false);

    // every() over an empty list is vacuously true.
    expect(
      isPureClientCondition(cond({ condition: "and", conditions: [] }))
    ).toBe(true);
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

    it("drops a non-numeric, non-entity-id bound (lovelace ignores it)", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: "foo",
            below: 10,
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        below: 10,
      });
    });

    it("treats a null bound as absent (matching lovelace's == null check)", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: null,
            below: 10,
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        below: 10,
      });
    });

    it("coerces an empty-string bound to 0 (matching lovelace Number())", () => {
      expect(
        translateToCoreCondition(
          cond({ condition: "numeric_state", entity: "sensor.a", above: "" })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: 0,
      });
    });

    it("keeps the lovelace outcome for infinite bounds instead of emitting Infinity", () => {
      // Lovelace does not ignore Infinity (isNaN is false): `above: +∞` and
      // `below: -∞` can never pass, while `above: -∞` and `below: +∞` always do.
      const ALWAYS_FALSE = {
        condition: "not",
        conditions: [{ condition: "and", conditions: [] }],
      };
      const numeric = (bounds: Record<string, unknown>) =>
        translateToCoreCondition(
          cond({ condition: "numeric_state", entity: "sensor.a", ...bounds })
        );
      expect(numeric({ above: "1e400", below: 10 })).toEqual(ALWAYS_FALSE);
      expect(numeric({ above: 5, below: -Infinity })).toEqual(ALWAYS_FALSE);
      expect(numeric({ above: "-1e400", below: 10 })).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        below: 10,
      });
      expect(numeric({ above: 5, below: Infinity })).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: 5,
      });
    });

    // Core's numeric_state schema requires at least one bound, so a leaf left
    // bound-less must not be emitted as-is: it would fail the whole grouped
    // subscription. Lovelace only requires the value to be numeric in that
    // case, which a template expresses faithfully.
    it("falls back to a numeric-value template when every bound is dropped", () => {
      expect(
        translateToCoreCondition(
          cond({ condition: "numeric_state", entity: "sensor.a", above: "foo" })
        )
      ).toEqual({
        condition: "template",
        value_template: '{{ is_number(states("sensor.a")) }}',
      });
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            attribute: "temperature",
            above: "-1e400",
            below: "bar",
          })
        )
      ).toEqual({
        condition: "template",
        value_template:
          '{{ is_number(state_attr("sensor.a", "temperature")) }}',
      });
    });

    it("falls back to a numeric-value template when no bound is configured", () => {
      expect(
        translateToCoreCondition(
          cond({ condition: "numeric_state", entity: "sensor.a" })
        )
      ).toEqual({
        condition: "template",
        value_template: '{{ is_number(states("sensor.a")) }}',
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

    it("wraps a single-child not in an and as well", () => {
      // Core skips a disabled child; only the `and` wrapper turns that into
      // ¬true = false (lovelace ¬(AND)) rather than core's bare-not ¬(OR of
      // nothing) = true.
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
        conditions: [
          {
            condition: "and",
            conditions: [
              { condition: "state", entity_id: "light.a", state: "on" },
            ],
          },
        ],
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

    it("preserves core row metadata on translated lovelace leaves", () => {
      expect(
        translateToCoreCondition(
          cond({
            condition: "state",
            entity: "light.a",
            state: "on",
            enabled: "{{ is_state('input_boolean.x', 'on') }}",
            alias: "Lit",
          })
        )
      ).toEqual({
        condition: "state",
        entity_id: "light.a",
        state: "on",
        enabled: "{{ is_state('input_boolean.x', 'on') }}",
        alias: "Lit",
      });
      expect(
        translateToCoreCondition(
          cond({
            condition: "state",
            entity: "light.a",
            state_not: "on",
            alias: "Dark",
          })
        )
      ).toEqual({
        condition: "not",
        alias: "Dark",
        conditions: [{ condition: "state", entity_id: "light.a", state: "on" }],
      });
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: 1,
            note: "n",
          })
        )
      ).toEqual({
        condition: "numeric_state",
        entity_id: "sensor.a",
        above: 1,
        note: "n",
      });
    });

    it("preserves core row metadata on the fallback translations", () => {
      const enabled = "{{ is_state('input_boolean.x', 'on') }}";
      expect(
        translateToCoreCondition(
          cond({
            condition: "numeric_state",
            entity: "sensor.a",
            above: "foo",
            enabled,
          })
        )
      ).toEqual({
        condition: "template",
        value_template: '{{ is_number(states("sensor.a")) }}',
        enabled,
      });
      expect(
        translateToCoreCondition(
          cond({ condition: "state", entity: "light.a", enabled })
        )
      ).toEqual({
        condition: "not",
        conditions: [{ condition: "and", conditions: [] }],
        enabled,
      });
    });

    it("preserves core row metadata on rebuilt logical conditions", () => {
      // Core skips a disabled group; dropping `enabled` would evaluate it.
      expect(
        translateToCoreCondition(
          cond({
            condition: "not",
            enabled: false,
            alias: "Night",
            conditions: [
              { entity: "light.a", state: "on" },
              { entity: "light.b", state: "on" },
            ],
          })
        )
      ).toEqual({
        condition: "not",
        enabled: false,
        alias: "Night",
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
      expect(
        translateToCoreCondition(cond({ condition: "or", enabled: false }))
      ).toEqual({ condition: "and", enabled: false, conditions: [] });
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

  describe("incomplete conditions resolve to always-false", () => {
    // ¬(AND of nothing) = ¬true = false; matches checkConditionsMet, which
    // short-circuits incomplete state conditions to false, and avoids emitting
    // a schema-invalid core condition.
    const ALWAYS_FALSE = {
      condition: "not",
      conditions: [{ condition: "and", conditions: [] }],
    };

    it.each([
      [
        "state with an entity but no value",
        { condition: "state", entity: "light.a" },
      ],
      ["state with a value but no entity", { condition: "state", state: "on" }],
      [
        "state with an empty entity",
        { condition: "state", entity: "", state: "on" },
      ],
      ["legacy entity with no state", { entity: "light.a" }],
      ["empty object", {}],
      [
        "numeric_state with a bound but no entity",
        { condition: "numeric_state", above: 5 },
      ],
    ])("resolves %s to always-false", (_label, input) => {
      expect(translateToCoreCondition(cond(input))).toEqual(ALWAYS_FALSE);
    });
  });

  describe("entity-id comparison values", () => {
    it("passes the value through unchanged (such leaves are kept client-side)", () => {
      // Core only dereferences input_* comparison values, lovelace any existing
      // entity, so `isServerCondition` keeps this leaf client-evaluated; the
      // translation is only what the editor persists once the user saves it.
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
