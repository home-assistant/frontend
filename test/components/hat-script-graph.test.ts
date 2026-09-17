import { render } from "lit";
import { describe, expect, it } from "vitest";
import { HatScriptGraph } from "../../src/components/trace/hat-script-graph";
import type { Action, ParallelAction } from "../../src/data/script";
import type {
  ActionTraceStep,
  IfActionTraceStep,
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
      const graph = createGraph(
        scriptExecution === "cancelled" ? step : { ...step, error: "Failed" },
        { script_execution: scriptExecution }
      );
      expect(
        graph["_branchFinished"](prefix, [{ action: "light.turn_on" }])
      ).toBe(false);
      graph.trace.last_step = `${lastPath}/sequence/0`;
      expect(graph["_branchFinished"](prefix, [{ sequence: [] }])).toBe(false);
      graph.trace.last_step = "sequence/0/then/01";
      expect(
        graph["_branchFinished"](prefix, [{ action: "light.turn_on" }])
      ).toBe(false);
    }
  );

  it("does not complete the currently running final action", () => {
    const graph = createGraph(step, { state: "running" });
    expect(graph["_branchFinished"](prefix, [{ delay: 10 }])).toBe(false);
  });

  it.each(["running", "cancelled"] as const)(
    "does not infer parallel completion from a sibling when %s",
    (execution) => {
      const branchPrefix = "sequence/0/parallel/0/sequence/";
      const path = `${branchPrefix}0`;
      const siblingPath = "sequence/0/parallel/1/sequence/0";
      const graph = createGraph(step, {
        state: execution === "running" ? "running" : "stopped",
        script_execution: execution === "running" ? "finished" : execution,
        last_step: siblingPath,
        trace: {
          [path]: [{ ...step, path }],
          [siblingPath]: [
            { ...step, path: siblingPath, timestamp: "2026-09-17T00:00:01Z" },
          ],
        },
      });
      expect(
        graph["_branchFinished"](branchPrefix, [{ action: "script.slow" }])
      ).toBe(false);
      graph.trace.trace[path] = [
        { ...step, path, result: { delay: 10, done: false } },
      ];
      expect(graph["_branchFinished"](branchPrefix, [{ delay: 10 }])).toBe(
        false
      );
      graph.trace.trace[path] = [
        { ...step, path, result: { delay: 10, done: true } },
      ];
      expect(graph["_branchFinished"](branchPrefix, [{ delay: 10 }])).toBe(
        true
      );
    }
  );

  it.each(["aborted", "error"] as const)(
    "keeps successful parallel branches green when a sibling leaves the run %s",
    (scriptExecution) => {
      const branchPrefix = "sequence/0/parallel/0/sequence/";
      const path = `${branchPrefix}0`;
      const siblingPath = "sequence/0/parallel/1/sequence/0";
      const graph = createGraph(step, {
        script_execution: scriptExecution,
        last_step: siblingPath,
        trace: {
          [path]: [{ ...step, path }],
          [siblingPath]: [{ ...step, path: siblingPath, error: "Failed" }],
        },
      });
      expect(
        graph["_branchFinished"](branchPrefix, [{ action: "script.slow" }])
      ).toBe(true);
      expect(
        graph["_branchFinished"]("sequence/0/parallel/1/sequence/", [
          { action: "script.failing" },
        ])
      ).toBe(false);

      // A successful sibling can also be the last one to start an action.
      graph.trace.last_step = path;
      expect(
        graph["_branchFinished"](branchPrefix, [{ action: "script.slow" }])
      ).toBe(true);
    }
  );

  it.each([
    [
      "sequence/0/parallel/0/sequence/0/then/",
      "sequence/0/parallel/0/sequence/1",
    ],
    ["sequence/0/parallel/0/sequence/", "sequence/1"],
    ["action/0/parallel/0/sequence/", "action/1"],
  ])(
    "uses continuation after %s as rejoin evidence",
    (branchPrefix, nextPath) => {
      const path = `${branchPrefix}0`;
      const graph = createGraph(step, {
        state: "running",
        trace: {
          [path]: [{ ...step, path }],
          [nextPath]: [
            { ...step, path: nextPath, timestamp: "2026-09-17T00:00:01Z" },
          ],
        },
      });
      expect(
        graph["_branchFinished"](branchPrefix, [{ action: "script.slow" }])
      ).toBe(true);
      // A prior iteration's continuation cannot prove this invocation finished.
      graph.trace.trace[path][0].timestamp = "2026-09-17T00:00:02Z";
      expect(
        graph["_branchFinished"](branchPrefix, [{ action: "script.slow" }])
      ).toBe(false);
    }
  );

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
  const records: (ActionTraceStep | IfActionTraceStep)[] = [
    { ...step, path: "action/3", error: "ZeroDivisionError" },
    { ...step, path: "action/3/parallel/0/sequence/0" },
    {
      ...step,
      path: "action/3/parallel/1/sequence/0",
      result: { delay: 0.01, done: true },
    },
    {
      ...step,
      path: "action/3/parallel/2/sequence/0",
      result: { choice: 0 },
    },
    {
      ...step,
      path: "action/3/parallel/3/sequence/0",
      changed_variables: {
        wait: { remaining: 0, completed: false, trigger: null },
      },
      result: { delay: 0.005, done: true },
    },
    {
      ...step,
      path: "action/3/parallel/3/sequence/1",
      result: { choice: "then" },
    },
    {
      ...step,
      path: "action/3/parallel/3/sequence/1/then/0",
      result: { delay: 0.005, done: true },
    },
    {
      ...step,
      path: "action/3/parallel/4/sequence/0",
      error: "ZeroDivisionError",
    },
  ];
  const graph = createGraph(step, {
    script_execution: "error",
    last_step: "action/3/parallel/3/sequence/1/then/0",
    trace: Object.fromEntries(records.map((record) => [record.path, [record]])),
  });
  const container = document.createElement("div");
  render(graph["_renderParallelNode"](parallel, "action/3"), container);
  const outerBranches = Array.from(
    container
      .querySelector("hat-graph-branch")!
      .querySelectorAll(":scope > div")
  );
  expect(outerBranches.map((branch) => branch.hasAttribute("track"))).toEqual([
    true,
    true,
    true,
    true,
    true,
  ]);
  expect(
    outerBranches.map((branch) => branch.hasAttribute("unfinished"))
  ).toEqual([false, false, false, false, true]);
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
    const graph = createGraph(step, {
      trace: { [iterations[0].path]: iterations },
    });
    const container = document.createElement("div");
    render(
      graph["_renderRepeatNode"](
        { repeat: { count: 50, sequence: [{ delay: 1 }] } },
        "sequence/0"
      ),
      container
    );
    expect(container.querySelector("hat-graph-node")?.badge).toBe(index ?? 20);
  }
);
