import { describe, expect, it } from "vitest";
import type { Action } from "../../src/data/script";
import type {
  ActionTraceStep,
  AutomationTraceExtended,
  ScriptTraceExtended,
} from "../../src/data/trace";
import { TraceTree, type TraceBranch } from "../../src/data/trace-tree";

const timestamp = "2026-09-17T00:00:00Z";
const step = { path: "sequence/0/then/0", timestamp };
const lastPath = "sequence/0/then/0";

const createTrace = (
  sequence: Action[],
  records: ActionTraceStep[] = [],
  overrides: Partial<ScriptTraceExtended> = {}
): ScriptTraceExtended => ({
  domain: "script",
  item_id: "test",
  run_id: "test",
  state: "stopped",
  script_execution: "finished",
  last_step: records[records.length - 1]?.path ?? null,
  timestamp: { start: timestamp, finish: timestamp },
  context: { id: "test", user_id: null },
  config: { alias: "Test", sequence },
  trace: records.reduce<Record<string, ActionTraceStep[]>>((steps, record) => {
    (steps[record.path] ??= []).push(record);
    return steps;
  }, {}),
  ...overrides,
});

const createAutomationTrace = (
  config: AutomationTraceExtended["config"],
  records: ActionTraceStep[] = []
): AutomationTraceExtended => {
  const { blueprint_inputs: _dropped, ...scriptTrace } = createTrace(
    [],
    records
  );
  return { ...scriptTrace, domain: "automation", trigger: null, config };
};

// Branch completion is observed through the public branch flags, exercising
// the same code paths the graph renders from.
const thenBranchOf = (
  steps: Action[],
  records: ActionTraceStep[],
  overrides: Partial<ScriptTraceExtended> = {}
): TraceBranch =>
  new TraceTree(createTrace([{ if: [], then: steps }], records, overrides))
    .sequence[0].branches[0];

describe("TraceTree", () => {
  it("normalizes nested branches and retains unexecuted nodes and original configs", () => {
    const leaf = { delay: 1 };
    const choose = {
      choose: {
        conditions: [],
        sequence: { repeat: { count: 2, sequence: leaf } },
      },
      default: { stop: "Fallback" },
    };
    const leafPath =
      "sequence/0/parallel/0/sequence/0/sequence/0/choose/0/sequence/0/repeat/sequence/0";
    const tree = new TraceTree(
      createTrace(
        [
          {
            parallel: [
              { sequence: [{ sequence: [choose] }] },
              { action: "light.turn_on" },
            ],
          },
        ],
        [{ path: leafPath, timestamp, result: { delay: 1, done: true } }]
      )
    );

    const [parallel] = tree.sequence;
    const [executed, unexecuted] = parallel.branches;
    const chooseNode = executed.children[0].branches[0].children[0];
    const [choice, fallback] = chooseNode.branches;
    const repeat = choice.children[0];
    const result = repeat.branches[0].children[0];
    expect(chooseNode.config).toBe(choose);
    expect(choice.option).toBe(choose.choose);
    expect(result.config).toBe(leaf);
    expect(result.path).toBe(leafPath);
    expect(result.hasTrace).toBe(true);
    // Descendant records still identify the chosen branch when Core drops its result.
    expect(choice.hasTrace).toBe(true);
    expect(repeat.branches[0].finished).toBe(true);
    expect(fallback.hasTrace).toBe(false);
    expect(fallback.children[0].config).toBe(choose.default);
    expect(unexecuted.children[0].path).toBe(
      "sequence/0/parallel/1/sequence/0"
    );
    // The model classifies a modern `action:` key as a service (which drives
    // the generic node's icon), while the graph keeps rendering the generic
    // node for it, as the old `key in node` lookup did.
    expect(unexecuted.children[0].actionType).toBe("service");
    expect(unexecuted.hasTrace).toBe(false);
    expect(unexecuted.finished).toBe(false);
  });

  it.each<Action>([{ choose: [] }, { if: [], then: [] }])(
    "distinguishes an implicit bypass from an error for %j",
    (action) => {
      const trace = createTrace([action], [{ path: "sequence/0", timestamp }]);
      const branches = new TraceTree(trace).sequence[0].branches;
      const bypass = branches[branches.length - 1]!;
      expect(bypass.hasTrace).toBe(true);
      expect(bypass.finished).toBe(true);
      expect(bypass.children).toEqual([]);

      trace.trace["sequence/0"][0].error = "Failed to evaluate condition";
      const failed = new TraceTree(trace).sequence[0];
      expect(failed.error).toBe(true);
      expect(failed.branches.every((branch) => !branch.hasTrace)).toBe(true);
    }
  );

  it("keeps both branch choices and condition outcomes across repeat iterations", () => {
    const condition = { condition: "template", value_template: "{{ ready }}" };
    const trace = createTrace(
      [{ if: [], then: condition, else: [] }],
      [
        { path: "sequence/0", timestamp, result: { choice: "then" } },
        { path: "sequence/0", timestamp, result: { choice: "else" } },
        { path: "sequence/0/then/0", timestamp, result: { result: false } },
        { path: "sequence/0/then/0", timestamp, result: { result: true } },
      ]
    );
    const [thenBranch, elseBranch] = new TraceTree(trace).sequence[0].branches;
    expect(thenBranch.hasTrace).toBe(true);
    expect(elseBranch.hasTrace).toBe(true);
    expect(thenBranch.children[0].condition).toEqual({
      executed: true,
      passed: true,
      failed: true,
    });
  });

  it("exposes disabled inheritance, branch state, and presentation fields", () => {
    const tree = new TraceTree(
      createTrace(
        [
          {
            enabled: false,
            choose: [{ conditions: [], sequence: [{ delay: 1 }] }],
            default: [],
          },
        ],
        [
          { path: "sequence/0", timestamp },
          {
            path: "sequence/0/choose/0/sequence/0",
            timestamp,
            result: { delay: 1, done: false },
          },
        ]
      )
    );
    const [choose] = tree.sequence;
    expect(choose.actionType).toBe("choose");
    expect(choose.disabled).toBe(true);
    const [choice, fallback] = choose.branches;
    expect(choice.disabled).toBe(true);
    expect(choice.children[0].disabled).toBe(true);
    expect(choice.unfinished).toBe(true);
    expect(fallback.unfinished).toBe(false);
    expect(choice.children[0].actionType).toBe("delay");
    expect(tree.getNode("sequence/0/choose/0")).toEqual({
      path: "sequence/0/choose/0",
      config: { conditions: [], sequence: [{ delay: 1 }] },
      type: "chooseOption",
    });
  });

  it("masks not-triggered runs but keeps them selectable with navigation", () => {
    const trace = createAutomationTrace(
      {
        alias: "Test",
        triggers: [{ trigger: "state" }],
        actions: [],
      },
      [{ path: "trigger/0", timestamp }]
    );
    const unmasked = new TraceTree({ ...trace, not_triggered: false });
    expect(unmasked.triggers?.[0]).toMatchObject({
      hasTrace: true,
      track: true,
    });
    const masked = new TraceTree({ ...trace, not_triggered: true });
    expect(masked.triggers?.[0]).toMatchObject({
      hasTrace: true,
      track: false,
      notTriggered: true,
    });
    expect(masked.firstTracked).toMatchObject({ path: "trigger/0" });
    expect(masked.previousTracked("trigger/0")).toBeUndefined();
    expect(masked.nextTracked("trigger/0")).toBeUndefined();
    // Unknown paths restart from the first tracked node, as the graph did.
    expect(masked.nextTracked("missing")).toMatchObject({ path: "trigger/0" });
  });

  it("maps condition outcomes and repeat badges for rendering", () => {
    const tree = new TraceTree(
      createTrace(
        [
          { condition: "template", value_template: "{{ ready }}" },
          { repeat: { count: 3, sequence: [{ delay: 1 }] } },
        ],
        [
          {
            path: "sequence/0",
            timestamp,
            result: { result: true },
          },
          { path: "sequence/1", timestamp },
          {
            path: "sequence/1/repeat/sequence/0",
            timestamp,
            changed_variables: { repeat: { index: 3 } },
            result: { delay: 1, done: false },
          },
        ]
      )
    );
    const [condition, repeat] = tree.sequence;
    expect(condition.track).toBe(true);
    expect(repeat.badge).toBe(3);
    expect(repeat.branches[0].unfinished).toBe(true);
    expect(tree.trackedPaths).toEqual([
      "sequence/0",
      "sequence/1",
      "sequence/1/repeat/sequence/0",
    ]);
  });

  it("uses canonical trace paths for plural automation keys and nested triggers", () => {
    const tree = new TraceTree(
      createAutomationTrace({
        alias: "Test",
        triggers: [
          { triggers: [{ trigger: "state", entity_id: "light.test" }] },
        ],
        conditions: { condition: "template", value_template: "{{ ready }}" },
        actions: { action: "light.turn_on" },
      })
    );
    expect(tree.triggers?.map((node) => node.path)).toEqual(["trigger/0"]);
    expect(tree.conditions.map((node) => node.path)).toEqual(["condition/0"]);
    expect(tree.actions.map((node) => node.path)).toEqual(["action/0"]);
    expect(tree.sequence).toEqual([]);
  });
});

describe("TraceTree branch completion", () => {
  it("marks only branches with traced steps as tracked", () => {
    const [thenBranch, elseBranch] = new TraceTree(
      createTrace(
        [{ if: [], then: [{ delay: 1 }], else: [{ delay: 2 }] }],
        [step]
      )
    ).sequence[0].branches;
    expect(thenBranch.hasTrace).toBe(true);
    expect(elseBranch.hasTrace).toBe(false);
    expect(elseBranch.finished).toBe(false);
    expect(elseBranch.unfinished).toBe(false);
  });

  it.each<Action>([
    { wait_template: "{{ false }}", continue_on_timeout: false },
    { wait_for_trigger: [], continue_on_timeout: false },
  ])("does not complete an aborted final wait: %j", (action) => {
    const branch = thenBranchOf(
      [action],
      [
        {
          ...step,
          result: { wait: { completed: false, remaining: 0 }, timeout: true },
        },
      ],
      { script_execution: "aborted" }
    );
    expect(branch.finished).toBe(false);
    expect(branch.unfinished).toBe(true);
  });

  it.each<Action>([
    { wait_template: "{{ false }}", continue_on_timeout: true },
    { wait_for_trigger: [], continue_on_timeout: true },
    { wait_template: "{{ false }}" },
    { wait_for_trigger: [] },
  ])(
    "completes a timed-out wait when continuation is enabled: %j",
    (action) => {
      // Core reports `timeout: true` together with `wait.completed: false`;
      // with `continue_on_timeout` true (or omitted, which defaults to
      // continuing) the branch rejoins instead of stalling.
      const branch = thenBranchOf(
        [action],
        [
          {
            ...step,
            result: { wait: { completed: false, remaining: 0 }, timeout: true },
          },
        ]
      );
      expect(branch.finished).toBe(true);
      expect(branch.unfinished).toBe(false);
    }
  );

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
      const branch = thenBranchOf(
        [
          {
            wait_template: "{{ ready }}",
            continue_on_timeout: continueOnTimeout,
          },
        ],
        [{ ...step, result: { wait: { completed, remaining } } }],
        { last_step: "sequence/1" }
      );
      expect(branch.finished).toBe(expected);
    }
  );

  it.each(["aborted", "cancelled", "error"] as const)(
    "does not complete the terminal branch when execution is %s",
    (scriptExecution) => {
      const records: ActionTraceStep[] =
        scriptExecution === "cancelled"
          ? [step]
          : [{ ...step, error: "Failed" }];
      const finishedIn = (steps: Action[], lastStep?: string) => {
        const trace = createTrace([{ if: [], then: steps }], records, {
          script_execution: scriptExecution,
          ...(lastStep !== undefined ? { last_step: lastStep } : {}),
        });
        return new TraceTree(trace).sequence[0].branches[0].finished;
      };
      expect(finishedIn([{ action: "light.turn_on" }])).toBe(false);
      expect(finishedIn([{ sequence: [] }], `${lastPath}/sequence/0`)).toBe(
        false
      );
      expect(
        finishedIn([{ action: "light.turn_on" }], "sequence/0/then/01")
      ).toBe(false);
    }
  );

  it("does not complete the currently running final action", () => {
    expect(
      thenBranchOf([{ delay: 10 }], [step], { state: "running" }).finished
    ).toBe(false);
  });

  it.each(["sequence/0", "then/0", "repeat/sequence/0"])(
    "does not rejoin after a nested stop at %s, even when a sibling ran last",
    (descendant) => {
      const stopPath = `${lastPath}/${descendant}`;
      const baseTrace = createTrace(
        [{ if: [], then: [{ sequence: [] }] }],
        [],
        {
          last_step: "sequence/0/else/0",
        }
      );
      baseTrace.trace = {
        [lastPath]: [step],
        [stopPath]: [
          { ...step, path: stopPath, result: { stop: "", error: false } },
        ],
      };
      const finished = () =>
        new TraceTree(baseTrace).sequence[0].branches[0].finished;
      expect(finished()).toBe(false);

      // A stop from an earlier invocation cannot stop this one.
      baseTrace.trace[lastPath] = [
        { ...step, timestamp: "2026-09-17T00:00:01Z" },
      ];
      expect(finished()).toBe(true);

      // A false nested condition returns control to its enclosing sequence.
      baseTrace.trace[lastPath] = [step];
      baseTrace.trace[stopPath] = [
        { ...step, path: stopPath, result: { result: false } },
      ];
      expect(finished()).toBe(true);
    }
  );

  it.each(["running", "cancelled"] as const)(
    "does not infer parallel completion from a sibling when %s",
    (execution) => {
      const path = "sequence/0/parallel/0/sequence/0";
      const siblingPath = "sequence/0/parallel/1/sequence/0";
      const sibling: ActionTraceStep = {
        ...step,
        path: siblingPath,
        timestamp: "2026-09-17T00:00:01Z",
      };
      const finishedIn = (
        steps: Action[],
        record: ActionTraceStep
      ): boolean => {
        const trace = createTrace([{ parallel: [{ sequence: steps }] }], [], {
          state: execution === "running" ? "running" : "stopped",
          script_execution: execution === "running" ? "finished" : execution,
          last_step: siblingPath,
        });
        trace.trace = {
          [path]: [record],
          [siblingPath]: [sibling],
        };
        return new TraceTree(trace).sequence[0].branches[0].finished;
      };
      expect(finishedIn([{ action: "script.slow" }], { ...step, path })).toBe(
        false
      );
      expect(
        finishedIn([{ delay: 10 }], {
          ...step,
          path,
          result: { delay: 10, done: false },
        })
      ).toBe(false);
      expect(
        finishedIn([{ delay: 10 }], {
          ...step,
          path,
          result: { delay: 10, done: true },
        })
      ).toBe(true);
    }
  );

  it.each(["aborted", "error"] as const)(
    "keeps successful parallel branches green when a sibling leaves the run %s",
    (scriptExecution) => {
      const path = "sequence/0/parallel/0/sequence/0";
      const siblingPath = "sequence/0/parallel/1/sequence/0";
      const treeFor = (lastStep: string): TraceTree => {
        const trace = createTrace(
          [
            {
              parallel: [
                { sequence: [{ action: "script.slow" }] },
                { sequence: [{ action: "script.failing" }] },
              ],
            },
          ],
          [],
          { script_execution: scriptExecution, last_step: lastStep }
        );
        trace.trace = {
          [path]: [{ ...step, path }],
          [siblingPath]: [{ ...step, path: siblingPath, error: "Failed" }],
        };
        return new TraceTree(trace);
      };
      const tree = treeFor(siblingPath);
      expect(tree.sequence[0].branches[0].finished).toBe(true);
      expect(tree.sequence[0].branches[1].finished).toBe(false);

      // A successful sibling can also be the last one to start an action.
      expect(treeFor(path).sequence[0].branches[0].finished).toBe(true);
    }
  );

  it("uses continuation after a branch as rejoin evidence", () => {
    const checkRejoin = (
      trace: ScriptTraceExtended | AutomationTraceExtended,
      select: (tree: TraceTree) => TraceBranch,
      path: string,
      nextPath: string
    ) => {
      trace.trace = {
        [path]: [{ ...step, path }],
        [nextPath]: [
          { ...step, path: nextPath, timestamp: "2026-09-17T00:00:01Z" },
        ],
      };
      expect(select(new TraceTree(trace)).finished).toBe(true);
      // A prior iteration's continuation cannot prove this invocation finished.
      trace.trace[path][0].timestamp = "2026-09-17T00:00:02Z";
      expect(select(new TraceTree(trace)).finished).toBe(false);
    };

    // Continuation after a nested if rejoins its enclosing parallel branch.
    checkRejoin(
      createTrace(
        [
          {
            parallel: [
              {
                sequence: [
                  { if: [], then: [{ action: "script.slow" }] },
                  { action: "script.next" },
                ],
              },
            ],
          },
        ],
        [],
        { state: "running" }
      ),
      (tree) => tree.sequence[0].branches[0].children[0].branches[0],
      "sequence/0/parallel/0/sequence/0/then/0",
      "sequence/0/parallel/0/sequence/1"
    );

    // Continuation after a parallel branch rejoins the top-level sequence.
    checkRejoin(
      createTrace(
        [
          { parallel: [{ sequence: [{ action: "script.slow" }] }] },
          { action: "script.next" },
        ],
        [],
        { state: "running" }
      ),
      (tree) => tree.sequence[0].branches[0],
      "sequence/0/parallel/0/sequence/0",
      "sequence/1"
    );

    // Same rejoin under the plural automation action key.
    const automationTrace = createAutomationTrace(
      {
        alias: "Test",
        triggers: [],
        actions: [
          { parallel: [{ sequence: [{ action: "script.slow" }] }] },
          { action: "script.next" },
        ],
      },
      []
    );
    automationTrace.state = "running";
    checkRejoin(
      automationTrace,
      (tree) => tree.actions[0].branches[0],
      "action/0/parallel/0/sequence/0",
      "action/1"
    );
  });

  it("allows a disabled wait to be skipped", () => {
    expect(
      thenBranchOf(
        [{ wait_template: "{{ false }}", enabled: false }],
        [{ ...step, result: { enabled: false } }]
      ).finished
    ).toBe(true);
  });

  it.each<Action>([
    { action: "light.turn_on", enabled: false },
    { stop: "Done", enabled: false },
    { condition: "template", value_template: "{{ false }}", enabled: false },
    { delay: 10, enabled: false },
  ])("completes a disabled terminal action: %j", (action) => {
    // A disabled final action is skipped by Core, so its branch is done even
    // while a parallel sibling is still running.
    const branch = thenBranchOf(
      [action],
      [{ ...step, result: { enabled: false } }],
      { state: "running" }
    );
    expect(branch.finished).toBe(true);
    expect(branch.unfinished).toBe(false);
  });

  it("tracks an empty parallel branch when the parent ran", () => {
    const tree = new TraceTree(
      createTrace(
        [{ parallel: [{ sequence: [] }] }],
        [{ path: "sequence/0", timestamp }]
      )
    );
    const [branch] = tree.sequence[0].branches;
    expect(branch.hasTrace).toBe(true);
    expect(branch.finished).toBe(true);
    expect(branch.unfinished).toBe(false);
  });

  it("preserves empty, unreached, error, condition and stop handling", () => {
    const finishedIn = (steps: Action[], records: ActionTraceStep[]) => {
      const trace = createTrace([{ if: [], then: steps }], records, {
        last_step: "sequence/1",
      });
      return new TraceTree(trace).sequence[0].branches[0].finished;
    };
    expect(finishedIn([], [step])).toBe(true);
    expect(finishedIn([{ action: "light.turn_on" }], [step])).toBe(true);
    expect(finishedIn([{ stop: "Done" }], [step])).toBe(false);
    expect(
      finishedIn([{ action: "light.turn_on" }, { delay: 1 }], [step])
    ).toBe(false);
    expect(
      finishedIn([{ action: "light.turn_on" }], [{ ...step, error: "Failed" }])
    ).toBe(false);
    expect(
      finishedIn(
        [{ action: "light.turn_on", continue_on_error: true }],
        [{ ...step, error: "Failed" }]
      )
    ).toBe(true);
    expect(
      finishedIn(
        [{ condition: "template", value_template: "{{ false }}" }],
        [{ ...step, result: { result: false } }]
      )
    ).toBe(false);
  });
});
