import { describe, expect, it } from "vitest";
import type { HomeAssistant } from "../../src/types";
import type { AutomationTraceExtended } from "../../src/data/trace";
import { buildTraceLabels } from "../../src/data/trace-labels";

// These labels are the only thing a screen reader gets from the graph, which
// is pure SVG. The run outcome in particular is otherwise conveyed only by
// colour, dashes and badges.
const timestamp = "2026-09-17T00:00:00Z";

/** `localize` echoes key and placeholders, so assertions skip English copy. */
const hassStub = () =>
  ({
    localize: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join("|")})` : key,
    locale: { language: "en" },
    states: {},
    services: {},
    entities: {},
    config: {},
    formatEntityState: () => "",
    formatEntityAttributeValue: () => "",
  }) as unknown as HomeAssistant;

const createTrace = (
  config: Record<string, unknown>,
  trace: AutomationTraceExtended["trace"] = {}
): AutomationTraceExtended =>
  ({
    domain: "automation",
    item_id: "test",
    run_id: "test",
    state: "stopped",
    script_execution: "finished",
    last_step: null,
    timestamp: { start: timestamp, finish: timestamp },
    context: { id: "test", user_id: null },
    trigger: "manual",
    config: {
      alias: "Test",
      triggers: [],
      conditions: [],
      actions: [],
      ...config,
    },
    trace,
  }) as AutomationTraceExtended;

const build = (trace: AutomationTraceExtended) =>
  buildTraceLabels(trace, hassStub(), undefined);

const step = (path: string, extra: Record<string, unknown> = {}) => ({
  [path]: [{ path, timestamp, ...extra }],
});

describe("buildTraceLabels", () => {
  it("says a step ran", () => {
    const labels = build(
      createTrace({ actions: [{ delay: 1 }] }, step("action/0") as never)
    );
    expect(labels["action/0"]).toContain("state.executed");
  });

  it("says a step the run never reached did not run", () => {
    const labels = build(createTrace({ actions: [{ delay: 1 }] }));
    expect(labels["action/0"]).toContain("state.not_executed");
  });

  it("prefers disabled over not executed", () => {
    // A disabled step is never tracked either, so the order of the checks is
    // what decides which of the two a user hears.
    const labels = build(
      createTrace({ actions: [{ delay: 1, enabled: false }] })
    );
    expect(labels["action/0"]).toContain("state.disabled");
    expect(labels["action/0"]).not.toContain("not_executed");
  });

  it("prefers an error over the tracked state", () => {
    const labels = build(
      createTrace(
        { actions: [{ delay: 1 }] },
        step("action/0", { error: "boom" }) as never
      )
    );
    expect(labels["action/0"]).toContain("state.error");
  });

  it("counts the iterations of a repeat", () => {
    const labels = build(
      createTrace(
        { actions: [{ repeat: { count: 2, sequence: [{ delay: 1 }] } }] },
        {
          // Core records the repeat step itself as well as each iteration.
          "action/0": [{ path: "action/0", timestamp }],
          "action/0/repeat/sequence/0": [
            { path: "action/0/repeat/sequence/0", timestamp },
            { path: "action/0/repeat/sequence/0", timestamp },
          ],
        } as never
      )
    );
    expect(labels["action/0"]).toContain("state.repeated");
  });

  describe("conditions", () => {
    // A condition is tracked whether it passed or failed, so reading `track`
    // alone would report both as "executed" and hide the outcome that matters.
    const conditionTrace = (result: boolean) =>
      createTrace(
        { conditions: [{ condition: "state", entity_id: "light.kitchen" }] },
        {
          "condition/0": [
            { path: "condition/0", timestamp, result: { result } },
          ],
        } as never
      );

    it("says a condition passed", () => {
      expect(build(conditionTrace(true))["condition/0"]).toContain(
        "state.passed"
      );
    });

    it("says a condition failed rather than merely executed", () => {
      const label = build(conditionTrace(false))["condition/0"];
      expect(label).toContain("state.failed");
      expect(label).not.toContain("state.executed");
    });

    it("reports both outcomes when a repeated condition did each", () => {
      const labels = build(
        createTrace(
          { conditions: [{ condition: "state", entity_id: "light.kitchen" }] },
          {
            "condition/0": [
              { path: "condition/0", timestamp, result: { result: true } },
              { path: "condition/0", timestamp, result: { result: false } },
            ],
          } as never
        )
      );
      expect(labels["condition/0"]).toContain("state.passed_and_failed");
    });

    it("says an unevaluated condition did not run", () => {
      const labels = build(
        createTrace({
          conditions: [{ condition: "state", entity_id: "light.kitchen" }],
        })
      );
      expect(labels["condition/0"]).toContain("state.not_executed");
    });
  });

  it("names every node of a nested config, down to the nested steps", () => {
    const labels = build(
      createTrace({
        triggers: [{ trigger: "state", entity_id: "light.kitchen" }],
        conditions: [{ condition: "state", entity_id: "light.kitchen" }],
        actions: [
          {
            choose: [
              { conditions: [], sequence: [{ delay: 1 }] },
              { conditions: [], sequence: [{ delay: 2 }] },
            ],
          },
          { if: [], then: [{ delay: 1 }], else: [{ delay: 2 }] },
          { parallel: [{ sequence: [{ delay: 1 }] }] },
          { repeat: { count: 2, sequence: [{ delay: 1 }] } },
        ],
      })
    );

    for (const path of [
      "trigger/0",
      "condition/0",
      // The building blocks themselves...
      "action/0",
      "action/0/choose/0",
      "action/0/choose/1",
      "action/1",
      "action/2",
      "action/3",
      // ...and the steps nested inside each branch, which only the recursion
      // in `addAction` reaches.
      "action/0/choose/0/sequence/0",
      "action/0/choose/1/sequence/0",
      "action/1/then/0",
      "action/1/else/0",
      "action/2/parallel/0/sequence/0",
      "action/3/repeat/sequence/0",
    ]) {
      expect(labels[path], path).toBeTruthy();
    }
  });

  it("works without an entity registry, which loads lazily", () => {
    const labels = build(
      createTrace({
        triggers: [{ trigger: "state", entity_id: "light.kitchen" }],
      })
    );
    expect(labels["trigger/0"]).toBeTruthy();
  });
});
