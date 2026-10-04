import { render } from "lit";
import { describe, expect, it } from "vitest";
import type { HatGraphNode } from "../../src/components/trace/hat-graph-node";
import { HatScriptGraph } from "../../src/components/trace/hat-script-graph";
import type { ParallelAction, RepeatAction } from "../../src/data/script";
import type {
  ActionTraceStep,
  IfActionTraceStep,
  ScriptTraceExtended,
} from "../../src/data/trace";
import { TraceTree, type TraceActionNode } from "../../src/data/trace-tree";

// Branch-completion logic is covered against the model in
// test/data/trace-tree.test.ts. These tests cover the graph wiring that the
// model cannot: track/unfinished attributes and badges in rendered output.
const timestamp = "2026-09-17T00:00:00Z";
const step = { path: "sequence/0", timestamp };

const createTrace = (
  trace: ScriptTraceExtended["trace"],
  overrides: Partial<ScriptTraceExtended> = {}
): ScriptTraceExtended => ({
  domain: "script",
  item_id: "test",
  run_id: "test",
  state: "stopped",
  script_execution: "finished",
  last_step: null,
  timestamp: { start: timestamp, finish: timestamp },
  context: { id: "test", user_id: null },
  config: { alias: "Test", sequence: [] },
  trace,
  ...overrides,
});

describe("hat-script-graph rendering", () => {
  it("rejoins the four successful branches in the reported five-branch trace", () => {
    // Reduced from the supplied stress-test trace: E fails before its final
    // step, while A-D finish. The global last_step belongs to successful D.
    const parallel: ParallelAction = {
      parallel: [
        { sequence: [{ repeat: { count: 3, sequence: [{ delay: 0.005 }] } }] },
        { sequence: [{ if: [], then: [{ delay: 0.005 }] }] },
        {
          sequence: [
            { choose: [{ conditions: [], sequence: [{ delay: 0.005 }] }] },
          ],
        },
        {
          sequence: [
            { wait_for_trigger: [], timeout: 0.1, continue_on_timeout: true },
            { if: [], then: [{ delay: 0.005 }] },
          ],
        },
        { sequence: [{ action: "system_log.write" }, { delay: 0.005 }] },
      ],
    };
    const at = (suffix: string) => `sequence/0/parallel/${suffix}`;
    const records: (ActionTraceStep | IfActionTraceStep)[] = [
      { ...step, error: "ZeroDivisionError" },
      { ...step, path: at("0/sequence/0") },
      {
        ...step,
        path: at("1/sequence/0"),
        result: { delay: 0.01, done: true },
      },
      {
        ...step,
        path: at("2/sequence/0"),
        result: { choice: 0 },
      },
      {
        ...step,
        path: at("3/sequence/0"),
        changed_variables: {
          wait: { remaining: 0, completed: false, trigger: null },
        },
        result: { delay: 0.005, done: true },
      },
      {
        ...step,
        path: at("3/sequence/1"),
        result: { choice: "then" },
      },
      {
        ...step,
        path: at("3/sequence/1/then/0"),
        result: { delay: 0.005, done: true },
      },
      {
        ...step,
        path: at("4/sequence/0"),
        error: "ZeroDivisionError",
      },
    ];
    const trace = createTrace(
      Object.fromEntries(records.map((record) => [record.path, [record]])),
      {
        config: { alias: "Test", sequence: [parallel] },
        script_execution: "error",
        last_step: at("3/sequence/1/then/0"),
      }
    );
    const graph = new HatScriptGraph();
    graph.trace = trace;
    const node = new TraceTree(trace)
      .sequence[0] as TraceActionNode<ParallelAction>;
    const container = document.createElement("div");
    render(graph["_renderParallelNode"](node), container);
    const outerBranches = Array.from(
      container
        .querySelector("hat-graph-branch")!
        .querySelectorAll(":scope > div")
    );
    expect(outerBranches.map((branch) => branch.hasAttribute("track"))).toEqual(
      [true, true, true, true, true]
    );
    expect(
      outerBranches.map((branch) => branch.hasAttribute("unfinished"))
    ).toEqual([false, false, false, false, true]);
  });

  it("does not track a repeat body that was never entered", () => {
    // Core recorded the repeat action, but `count: 0` means no body step ran.
    const trace = createTrace(
      { "sequence/0": [step] },
      {
        config: {
          alias: "Test",
          sequence: [{ repeat: { count: 0, sequence: [{ delay: 1 }] } }],
        },
      }
    );
    const graph = new HatScriptGraph();
    graph.trace = trace;
    const node = new TraceTree(trace)
      .sequence[0] as TraceActionNode<RepeatAction>;
    const container = document.createElement("div");
    render(graph["_renderRepeatNode"](node), container);
    const body = container.querySelector(".repeat-sequence")!;
    expect(body.hasAttribute("track")).toBe(false);
    expect(body.hasAttribute("unfinished")).toBe(false);
  });

  it.each([45, undefined])(
    "uses the recorded repeat index (%s) before the retained count",
    (index) => {
      const iterations = Array.from({ length: 20 }, (_, i) => ({
        ...step,
        path: "sequence/0/repeat/sequence/0",
        changed_variables:
          index === undefined ? {} : { repeat: { index: index - 19 + i } },
      }));
      const trace = createTrace(
        { [iterations[0].path]: iterations },
        {
          config: {
            alias: "Test",
            sequence: [{ repeat: { count: 50, sequence: [{ delay: 1 }] } }],
          },
        }
      );
      const graph = new HatScriptGraph();
      graph.trace = trace;
      const node = new TraceTree(trace)
        .sequence[0] as TraceActionNode<RepeatAction>;
      const container = document.createElement("div");
      render(graph["_renderRepeatNode"](node), container);
      const nodes = container.querySelectorAll("hat-graph-node");
      expect((nodes[0] as HatGraphNode).badge).toBe(index ?? 20);
    }
  );
});
