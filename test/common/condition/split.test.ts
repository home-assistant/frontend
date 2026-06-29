import { describe, expect, it, vi } from "vitest";
import type { ClientConditionEvaluator } from "../../../src/common/condition/split";
import { splitConditionTree } from "../../../src/common/condition/split";
import type { VisibilityCondition } from "../../../src/panels/lovelace/common/validate-condition";

const cond = (c: any): VisibilityCondition => c as VisibilityCondition;

/** Build a client evaluator backed by object-identity lookup. */
const clientEvaluator =
  (
    results: Map<VisibilityCondition, boolean | undefined> = new Map()
  ): ClientConditionEvaluator =>
  (c) =>
    results.get(c);

const noClient = clientEvaluator();

describe("splitConditionTree", () => {
  it("returns no subtrees for an all-client tree", () => {
    const screen = cond({
      condition: "screen",
      media_query: "(min-width: 1px)",
    });
    const time = cond({ condition: "time", after: "08:00" });
    const split = splitConditionTree([screen, time]);

    expect(split.serverSubtrees).toHaveLength(0);
    expect(
      split.evaluate(
        clientEvaluator(
          new Map([
            [screen, true],
            [time, true],
          ])
        ),
        {}
      )
    ).toBe(true);
    expect(
      split.evaluate(
        clientEvaluator(
          new Map([
            [screen, true],
            [time, false],
          ])
        ),
        {}
      )
    ).toBe(false);
  });

  it("creates one subtree for a single server leaf and translates it", () => {
    const split = splitConditionTree([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);

    expect(split.serverSubtrees).toHaveLength(1);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "state",
      entity_id: "light.a",
      state: "on",
    });

    expect(split.evaluate(noClient, { "0": true })).toBe(true);
    expect(split.evaluate(noClient, { "0": false })).toBe(false);
    // server result not reported yet
    expect(split.evaluate(noClient, {})).toBe(undefined);
  });

  it("groups sibling server conditions under the implicit AND into one subscription", () => {
    const split = splitConditionTree([
      cond({ condition: "state", entity: "light.a", state: "on" }),
      cond({ condition: "template", value_template: "{{ true }}" }),
    ]);

    expect(split.serverSubtrees).toHaveLength(1);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "and",
      conditions: [
        { condition: "state", entity_id: "light.a", state: "on" },
        { condition: "template", value_template: "{{ true }}" },
      ],
    });

    expect(split.evaluate(noClient, { "0": true })).toBe(true);
    expect(split.evaluate(noClient, { "0": false })).toBe(false);
  });

  it("combines one server subtree with a client leaf via AND", () => {
    const screen = cond({ condition: "screen", media_query: "x" });
    const split = splitConditionTree([
      cond({ condition: "state", entity: "light.a", state: "on" }),
      screen,
    ]);

    expect(split.serverSubtrees).toHaveLength(1);

    const withScreen = (v: boolean) => clientEvaluator(new Map([[screen, v]]));
    expect(split.evaluate(withScreen(true), { "0": true })).toBe(true);
    expect(split.evaluate(withScreen(false), { "0": true })).toBe(false);
    // false server result dominates even though the client leaf is unknown
    expect(split.evaluate(noClient, { "0": false })).toBe(false);
    // unknown server result with a passing client leaf → still unknown
    expect(split.evaluate(withScreen(true), {})).toBe(undefined);
  });

  it("groups server siblings under a mixed OR using the or operator", () => {
    const screen = cond({ condition: "screen", media_query: "x" });
    const split = splitConditionTree([
      cond({
        condition: "or",
        conditions: [
          { condition: "state", entity: "light.a", state: "on" },
          { condition: "state", entity: "light.b", state: "on" },
          screen,
        ],
      }),
    ]);

    expect(split.serverSubtrees).toHaveLength(1);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "or",
      conditions: [
        { condition: "state", entity_id: "light.a", state: "on" },
        { condition: "state", entity_id: "light.b", state: "on" },
      ],
    });

    const withScreen = (v: boolean) => clientEvaluator(new Map([[screen, v]]));
    // true server result dominates OR even though the client leaf is unknown
    expect(split.evaluate(noClient, { "0": true })).toBe(true);
    expect(split.evaluate(withScreen(true), { "0": false })).toBe(true);
    expect(split.evaluate(withScreen(false), { "0": false })).toBe(false);
    expect(split.evaluate(withScreen(false), {})).toBe(undefined);
  });

  it("sends a fully-server not as a single core not subscription", () => {
    const split = splitConditionTree([
      cond({
        condition: "not",
        conditions: [
          { condition: "state", entity: "light.a", state: "on" },
          { condition: "state", entity: "light.b", state: "on" },
        ],
      }),
    ]);

    expect(split.serverSubtrees).toHaveLength(1);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
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

    // negation handled server-side → just mirrors the subscription result
    expect(split.evaluate(noClient, { "0": true })).toBe(true);
    expect(split.evaluate(noClient, { "0": false })).toBe(false);
  });

  it("negates a mixed not client-side using ¬(AND) semantics", () => {
    const screen = cond({ condition: "screen", media_query: "x" });
    const split = splitConditionTree([
      cond({
        condition: "not",
        conditions: [
          { condition: "state", entity: "light.a", state: "on" },
          screen,
        ],
      }),
    ]);

    expect(split.serverSubtrees).toHaveLength(1);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "state",
      entity_id: "light.a",
      state: "on",
    });

    const withScreen = (v: boolean) => clientEvaluator(new Map([[screen, v]]));
    // ¬(server ∧ screen)
    expect(split.evaluate(withScreen(true), { "0": true })).toBe(false);
    expect(split.evaluate(withScreen(false), { "0": true })).toBe(true);
    expect(split.evaluate(withScreen(true), { "0": false })).toBe(true);
    // server unknown, screen passing → ¬(unknown) → unknown
    expect(split.evaluate(withScreen(true), {})).toBe(undefined);
    // server unknown but screen FALSE → ¬(unknown ∧ false) → ¬false → true
    // (false dominates AND even before the unknown is resolved)
    expect(split.evaluate(withScreen(false), {})).toBe(true);
  });

  it("groups multiple server children of a mixed not and negates ¬(AND)", () => {
    const screen = cond({ condition: "screen", media_query: "x" });
    const split = splitConditionTree([
      cond({
        condition: "not",
        conditions: [
          { condition: "state", entity: "light.a", state: "on" },
          { condition: "state", entity: "light.b", state: "on" },
          screen,
        ],
      }),
    ]);

    // the two server siblings are grouped under `and` (the not's inner operator)
    expect(split.serverSubtrees).toHaveLength(1);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "and",
      conditions: [
        { condition: "state", entity_id: "light.a", state: "on" },
        { condition: "state", entity_id: "light.b", state: "on" },
      ],
    });

    const withScreen = (v: boolean) => clientEvaluator(new Map([[screen, v]]));
    // ¬(serverGroup ∧ screen)
    expect(split.evaluate(withScreen(true), { "0": true })).toBe(false);
    expect(split.evaluate(withScreen(false), { "0": true })).toBe(true);
    expect(split.evaluate(withScreen(true), { "0": false })).toBe(true);
  });

  it("translates a fully-server empty not to a false-equivalent subscription", () => {
    const split = splitConditionTree([
      cond({ condition: "not", conditions: [] }),
    ]);
    expect(split.serverSubtrees).toHaveLength(1);
    // ¬(AND of nothing) = ¬true = false, not core's bare not([]) = true
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "not",
      conditions: [{ condition: "and", conditions: [] }],
    });
  });

  it("handles deep nesting with multiple subscriptions", () => {
    const screen = cond({ condition: "screen", media_query: "x" });
    const split = splitConditionTree([
      cond({ condition: "state", entity: "light.a", state: "on" }),
      cond({
        condition: "or",
        conditions: [
          { condition: "state", entity: "light.b", state: "on" },
          screen,
        ],
      }),
      cond({ condition: "template", value_template: "{{ true }}" }),
    ]);

    // subtree 0: grouped top-level server siblings (state.a AND template)
    // subtree 1: the server child of the mixed OR (state.b)
    expect(split.serverSubtrees).toHaveLength(2);
    expect(split.serverSubtrees[0].coreCondition).toEqual({
      condition: "and",
      conditions: [
        { condition: "state", entity_id: "light.a", state: "on" },
        { condition: "template", value_template: "{{ true }}" },
      ],
    });
    expect(split.serverSubtrees[1].coreCondition).toEqual({
      condition: "state",
      entity_id: "light.b",
      state: "on",
    });

    const withScreen = (v: boolean) => clientEvaluator(new Map([[screen, v]]));
    // top group true, OR satisfied by state.b
    expect(split.evaluate(withScreen(false), { "0": true, "1": true })).toBe(
      true
    );
    // top group true, OR satisfied by screen only
    expect(split.evaluate(withScreen(true), { "0": true, "1": false })).toBe(
      true
    );
    // top group false dominates
    expect(split.evaluate(withScreen(true), { "0": false, "1": true })).toBe(
      false
    );
    // top group true but OR fully false
    expect(split.evaluate(withScreen(false), { "0": true, "1": false })).toBe(
      false
    );
    // missing a result → unknown
    expect(split.evaluate(withScreen(false), { "0": true })).toBe(undefined);
  });

  it("treats an empty condition list as visible (vacuous AND)", () => {
    const split = splitConditionTree([]);
    expect(split.serverSubtrees).toHaveLength(0);
    expect(split.evaluate(noClient, {})).toBe(true);
  });

  it("passes the actual client condition object to the evaluator", () => {
    const screen = cond({ condition: "screen", media_query: "x" });
    const split = splitConditionTree([screen]);
    const evaluator = vi.fn<ClientConditionEvaluator>(() => true);

    expect(split.evaluate(evaluator, {})).toBe(true);
    expect(evaluator).toHaveBeenCalledWith(screen);
  });
});
