import { describe, expect, it } from "vitest";
import { HatScriptGraph } from "../../src/components/trace/hat-script-graph";
import type { Action } from "../../src/data/script";
import type {
  ActionTraceStep,
  ScriptTraceExtended,
} from "../../src/data/trace";

const prefix = "sequence/0/then/";
const lastPath = `${prefix}0`;

const createGraph = (
  step: ActionTraceStep,
  overrides: Partial<ScriptTraceExtended> = {}
) => {
  const graph = new HatScriptGraph();
  graph.trace = {
    domain: "script",
    item_id: "test",
    run_id: "test",
    state: "stopped",
    script_execution: "finished",
    last_step: lastPath,
    timestamp: {
      start: "2026-09-17T00:00:00Z",
      finish: "2026-09-17T00:00:01Z",
    },
    context: { id: "test", user_id: null },
    config: { alias: "Test", sequence: [] },
    trace: { [lastPath]: [step] },
    ...overrides,
  };
  return graph;
};

const step = { path: lastPath, timestamp: "2026-09-17T00:00:00Z" };

describe("trace branch completion", () => {
  it.each<Action>([
    { wait_template: "{{ false }}", continue_on_timeout: false },
    { wait_for_trigger: [], continue_on_timeout: false },
  ])("does not complete an aborted final wait: %j", (action) => {
    const graph = createGraph(
      {
        ...step,
        result: { wait: { completed: false, remaining: 0 }, timeout: true },
      },
      { script_execution: "aborted" }
    );
    expect(graph["_branchFinished"](prefix, [action])).toBe(false);
  });

  it.each([
    [true, 10, false, true],
    [false, 0, undefined, true],
    [false, 0, true, true],
    [false, 0, false, false],
    [false, 10, true, false],
    [false, null, true, false],
  ] as const)(
    "handles completed=%s remaining=%s continue_on_timeout=%s",
    (completed, remaining, continueOnTimeout, expected) => {
      // A parallel sibling may be last_step, so wait data must stand on its own.
      const graph = createGraph(
        {
          ...step,
          result: { wait: { completed, remaining } },
        },
        { last_step: "sequence/1" }
      );
      expect(
        graph["_branchFinished"](prefix, [
          {
            wait_template: "{{ ready }}",
            continue_on_timeout: continueOnTimeout,
          },
        ])
      ).toBe(expected);
    }
  );

  it.each(["aborted", "cancelled", "error"] as const)(
    "does not complete the terminal branch when execution is %s",
    (scriptExecution) => {
      const graph = createGraph(step, { script_execution: scriptExecution });
      expect(
        graph["_branchFinished"](prefix, [{ action: "light.turn_on" }])
      ).toBe(false);
      graph.trace.last_step = `${lastPath}/sequence/0`;
      expect(graph["_branchFinished"](prefix, [{ sequence: [] }])).toBe(false);
      graph.trace.last_step = "sequence/0/then/01";
      expect(
        graph["_branchFinished"](prefix, [{ action: "light.turn_on" }])
      ).toBe(true);
    }
  );

  it("does not complete the currently running final action", () => {
    const graph = createGraph(step, { state: "running" });
    expect(graph["_branchFinished"](prefix, [{ delay: 10 }])).toBe(false);
  });

  it("allows a disabled wait to be skipped", () => {
    const graph = createGraph({ ...step, result: { enabled: false } });
    expect(
      graph["_branchFinished"](prefix, [
        { wait_template: "{{ false }}", enabled: false },
      ])
    ).toBe(true);
  });

  it("preserves empty, unreached, error, condition and stop handling", () => {
    const graph = createGraph(step, { last_step: "sequence/1" });
    expect(graph["_branchFinished"](prefix, [])).toBe(true);
    expect(
      graph["_branchFinished"](prefix, [{ action: "light.turn_on" }])
    ).toBe(true);
    expect(graph["_branchFinished"](prefix, [{ stop: "Done" }])).toBe(false);
    expect(
      graph["_branchFinished"](prefix, [
        { action: "light.turn_on" },
        { delay: 1 },
      ])
    ).toBe(false);
    graph.trace.trace[lastPath] = [{ ...step, error: "Failed" }];
    expect(
      graph["_branchFinished"](prefix, [{ action: "light.turn_on" }])
    ).toBe(false);
    expect(
      graph["_branchFinished"](prefix, [
        { action: "light.turn_on", continue_on_error: true },
      ])
    ).toBe(true);
    graph.trace.trace[lastPath] = [{ ...step, result: { result: false } }];
    expect(
      graph["_branchFinished"](prefix, [
        { condition: "template", value_template: "{{ false }}" },
      ])
    ).toBe(false);
  });
});
