import { ensureArray } from "../common/array/ensure-array";
import { getAutomationActionType } from "./action";
import { flattenTriggers } from "./automation";
import type { Condition, Trigger } from "./automation";
import type {
  Action,
  ChooseAction,
  IfAction,
  Option,
  ParallelAction,
  RepeatAction,
  SequenceAction,
} from "./script";
import type {
  ActionTraceStep,
  ChooseActionTraceStep,
  ConditionTraceStep,
  DelayActionTraceStep,
  IfActionTraceStep,
  TraceExtended,
  WaitActionTraceStep,
} from "./trace";

export type TraceNodeType = "trigger" | "condition" | "action" | "chooseOption";

export type TraceActionNodeType =
  Exclude<ReturnType<typeof getAutomationActionType>, undefined> | "other";

export interface NodeInfo {
  path: string;
  config: unknown;
  type?: TraceNodeType;
}

export interface TraceNode<T = unknown> {
  path: string;
  config: T;
  type: TraceNodeType;
  /** Data fact: the path (or branch) was tracked by Core. */
  hasTrace: boolean;
  /** Visual execution state (triggers mask not-triggered, conditions use outcome). */
  track: boolean;
  error: boolean;
  /** Own `enabled === false` or inherited from an ancestor action. */
  disabled: boolean;
  notTriggered?: boolean;
  condition?: { executed: boolean; passed: boolean; failed: boolean };
}

export interface TraceActionNode<
  T extends Action = Action,
> extends TraceNode<T> {
  actionType: TraceActionNodeType;
  branches: TraceBranch[];
  iterations?: number;
  badge?: number;
}

export interface TraceBranch {
  path: string;
  children: TraceActionNode[];
  hasTrace: boolean;
  finished: boolean;
  unfinished: boolean;
  disabled: boolean;
  option?: Option;
}

const isDisabled = (config: unknown, parentDisabled: boolean): boolean =>
  parentDisabled ||
  (typeof config === "object" &&
    config !== null &&
    "enabled" in config &&
    (config as { enabled?: boolean }).enabled === false);

/** Configuration-shaped tree annotated with the execution tracked by Core. */
export class TraceTree {
  public readonly triggers?: TraceNode<Trigger>[];

  public readonly conditions: TraceNode<Condition>[];

  public readonly actions: TraceActionNode[];

  public readonly sequence: TraceActionNode[];

  /** All selectable nodes in render order, keyed by path. */
  public readonly renderedNodes: Record<string, NodeInfo> = {};

  /**
   * Selectable nodes that were tracked, sorted in trace order. Includes
   * not-triggered triggers so they remain navigable, even though their
   * `track` is false and they do not render as part of the executed path.
   */
  public readonly trackedNodes: Record<string, NodeInfo> = {};

  public readonly trackedPaths: string[] = [];

  constructor(public readonly trace: TraceExtended) {
    const config = trace.config;
    const triggerKey = "triggers" in config ? "triggers" : "trigger";
    const conditionKey = "conditions" in config ? "conditions" : "condition";
    const actionKey = "actions" in config ? "actions" : "action";
    this.triggers =
      triggerKey in config
        ? flattenTriggers(ensureArray(config[triggerKey])).map((trigger, i) =>
            this._triggerNode(trigger, `trigger/${i}`)
          )
        : undefined;
    this.conditions =
      conditionKey in config
        ? ensureArray<Condition>(config[conditionKey] ?? []).map(
            (condition, i) =>
              this._conditionNode(
                condition,
                `condition/${i}`,
                "condition",
                false
              )
          )
        : [];
    this.actions =
      actionKey in config
        ? this._actions(
            ensureArray<Action>(config[actionKey]),
            "action/",
            false
          )
        : [];
    this.sequence =
      "sequence" in config
        ? this._actions(
            ensureArray<Action>(config.sequence),
            "sequence/",
            false
          )
        : [];
    this._indexNodes();
  }

  public get firstTracked(): NodeInfo | undefined {
    return this.trackedNodes[this.trackedPaths[0]];
  }

  public getNode(path: string): NodeInfo | undefined {
    return this.renderedNodes[path];
  }

  public previousTracked(path: string): NodeInfo | undefined {
    // An unknown path yields index -2 and returns undefined, matching the
    // previous graph behavior.
    const index = this.trackedPaths.indexOf(path) - 1;
    return index >= 0 ? this.trackedNodes[this.trackedPaths[index]] : undefined;
  }

  public nextTracked(path: string): NodeInfo | undefined {
    // An unknown path yields index 0 and restarts from the first node,
    // matching the previous graph behavior.
    const index = this.trackedPaths.indexOf(path) + 1;
    return index < this.trackedPaths.length
      ? this.trackedNodes[this.trackedPaths[index]]
      : undefined;
  }

  private _base<T>(
    config: T,
    path: string,
    type: TraceNodeType,
    parentDisabled: boolean
  ): TraceNode<T> {
    const hasTrace = path in this.trace.trace;
    return {
      config,
      path,
      type,
      hasTrace,
      track: hasTrace,
      error: this.trace.trace[path]?.some((record) => record.error) ?? false,
      disabled: isDisabled(config, parentDisabled),
    };
  }

  private _triggerNode(config: Trigger, path: string): TraceNode<Trigger> {
    const node = this._base(config, path, "trigger", false);
    // A not-triggered trace records the trigger that evaluated a change but
    // decided not to fire. It is still selectable (to view the reason), but
    // must not be shown as the path that ran.
    node.notTriggered = node.hasTrace && !!this.trace.not_triggered;
    node.track = node.hasTrace && !node.notTriggered;
    return node;
  }

  private _conditionNode<T>(
    config: T,
    path: string,
    type: TraceNodeType,
    parentDisabled: boolean
  ): TraceNode<T> {
    const node = this._base(config, path, type, parentDisabled);
    const records = this.trace.trace[path] as ConditionTraceStep[] | undefined;
    const executed = !!records?.some((record) => record.result || record.error);
    node.condition = {
      executed,
      passed: !!records?.some((record) => record.result?.result),
      failed: !!records?.some(
        (record) => record.result && !record.result.result
      ),
    };
    node.track = executed;
    return node;
  }

  private _actions(
    actions: Action[],
    prefix: string,
    parentDisabled: boolean
  ): TraceActionNode[] {
    return actions.map((action, i) =>
      this._actionNode(action, `${prefix}${i}`, parentDisabled)
    );
  }

  private _branch(
    path: string,
    prefix: string,
    steps: Action[],
    parentDisabled: boolean,
    hasTrace = this._hasTracedSteps(prefix)
  ): TraceBranch {
    const children = this._actions(steps, prefix, parentDisabled);
    const finished = hasTrace ? this._branchFinished(prefix, steps) : false;
    return {
      path,
      children,
      hasTrace,
      finished,
      unfinished: hasTrace && !finished,
      disabled: parentDisabled,
    };
  }

  /** Build an action subtree, retaining the original config for selection. */
  private _actionNode<T extends Action>(
    config: T,
    path: string,
    parentDisabled = false
  ): TraceActionNode<T> {
    const actionType = getAutomationActionType(config) ?? "other";
    const node: TraceActionNode<T> = {
      ...(actionType === "condition"
        ? this._conditionNode(config, path, "action", parentDisabled)
        : this._base(config, path, "action", parentDisabled)),
      actionType,
      branches: [],
    };
    const disabled = node.disabled;
    switch (actionType) {
      case "choose": {
        const choose = config as ChooseAction;
        const records = this.trace.trace[path] as
          ChooseActionTraceStep[] | undefined;
        const choices =
          records?.map((record) =>
            record.result?.choice === "default" ||
            (!record.result && !record.error)
              ? "default"
              : record.result?.choice
          ) ?? [];
        node.branches = ensureArray<Option>(choose.choose ?? []).map(
          (option, i) => {
            const branchPath = `${path}/choose/${i}`;
            const prefix = `${branchPath}/sequence/`;
            return {
              ...this._branch(
                branchPath,
                prefix,
                ensureArray<Action>(option.sequence ?? []),
                disabled,
                choices.includes(i) || this._hasTracedSteps(prefix)
              ),
              option,
            };
          }
        );
        const prefix = `${path}/default/`;
        node.branches.push(
          this._branch(
            `${path}/default`,
            prefix,
            ensureArray<Action>(choose.default ?? []),
            disabled,
            choices.includes("default") || this._hasTracedSteps(prefix)
          )
        );
        break;
      }
      case "if": {
        const ifAction = config as IfAction;
        const records = this.trace.trace[path] as
          IfActionTraceStep[] | undefined;
        node.branches = (["then", "else"] as const).map((choice) => {
          const prefix = `${path}/${choice}/`;
          // Core sets no result for the implicit else bypass. An error instead
          // means execution aborted before choosing a branch.
          const hasTrace =
            !!records?.some(
              (record) =>
                record.result?.choice === choice ||
                (choice === "else" && !record.result && !record.error)
            ) || this._hasTracedSteps(prefix);
          return this._branch(
            `${path}/${choice}`,
            prefix,
            ensureArray<Action>(ifAction[choice] ?? []),
            disabled,
            hasTrace
          );
        });
        break;
      }
      case "repeat": {
        const repeat = config as RepeatAction;
        const prefix = `${path}/repeat/sequence/`;
        const iterations = this.trace.trace[`${prefix}0`];
        // Core's repeat.index is 1-based (1, 2, 3, …), so the last stored
        // index equals the completed count. Fall back to the stored record
        // count when the variable is absent, as iterationNumber does in
        // ha-trace-path-details.
        node.iterations =
          (
            iterations?.[iterations.length - 1]?.changed_variables?.repeat as
              { index?: number } | undefined
          )?.index ?? iterations?.length;
        node.badge =
          node.iterations !== undefined && node.iterations > 1
            ? node.iterations
            : undefined;
        node.branches = [
          this._branch(
            `${path}/repeat`,
            prefix,
            ensureArray<Action>(repeat.repeat.sequence),
            disabled
          ),
        ];
        break;
      }
      case "sequence":
        node.branches = [
          this._branch(
            `${path}/sequence`,
            `${path}/sequence/`,
            ensureArray<Action>((config as SequenceAction).sequence ?? []),
            disabled,
            node.hasTrace
          ),
        ];
        break;
      case "parallel":
        node.branches = ensureArray<Action>(
          (config as ParallelAction).parallel
        ).map((branch, i) => {
          const branchPath = `${path}/parallel/${i}`;
          const steps = ensureArray<Action>(
            "sequence" in branch
              ? ((branch as SequenceAction).sequence ?? [])
              : branch
          );
          const prefix = `${branchPath}/sequence/`;
          return this._branch(
            branchPath,
            prefix,
            steps,
            disabled,
            // An empty branch has no step path for Core to record. It ran
            // when the parent parallel action ran, matching the old graph
            // which tracked the branch wrapper from the parent path.
            steps.length === 0 ? node.hasTrace : this._hasTracedSteps(prefix)
          );
        });
        break;
    }
    return node;
  }

  private _indexNodes() {
    const ordered: NodeInfo[] = [];

    const visitAction = (node: TraceActionNode) => {
      ordered.push({
        path: node.path,
        config: node.config,
        type: "action",
      });
      if (node.actionType === "choose") {
        for (const branch of node.branches.slice(0, -1)) {
          ordered.push({
            path: branch.path,
            config: branch.option,
            type: "chooseOption",
          });
          branch.children.forEach(visitAction);
        }
        node.branches[node.branches.length - 1]?.children.forEach(visitAction);
      } else {
        node.branches.forEach((branch) => branch.children.forEach(visitAction));
      }
    };

    this.triggers?.forEach((node) =>
      ordered.push({ path: node.path, config: node.config, type: "trigger" })
    );
    this.conditions.forEach((node) =>
      ordered.push({ path: node.path, config: node.config, type: "condition" })
    );
    this.actions.forEach(visitAction);
    this.sequence.forEach(visitAction);

    // Preserve the previous render-then-sort order: untracked paths keep
    // relative render order ahead of tracked ones. Untracked paths get -1
    // so they sort before tracked paths, and Array.prototype.sort is stable
    // so their relative render order survives.
    const traceOrder = new Map<string, number>();
    let traceIndex = 0;
    for (const path of Object.keys(this.trace.trace)) {
      traceOrder.set(path, traceIndex++);
    }
    const trackedByPath = new Map<string, boolean>();
    const collectTracked = (nodes: TraceActionNode[]) => {
      for (const node of nodes) {
        trackedByPath.set(node.path, node.hasTrace);
        for (const branch of node.branches) {
          if (node.actionType === "choose" && branch.option !== undefined) {
            trackedByPath.set(branch.path, branch.hasTrace);
          }
          collectTracked(branch.children);
        }
      }
    };

    this.triggers?.forEach((node) =>
      trackedByPath.set(node.path, node.hasTrace)
    );
    this.conditions.forEach((node) =>
      trackedByPath.set(node.path, node.hasTrace)
    );
    collectTracked(this.actions);
    collectTracked(this.sequence);

    const sorted = ordered.sort(
      (a, b) => (traceOrder.get(a.path) ?? -1) - (traceOrder.get(b.path) ?? -1)
    );
    for (const info of sorted) {
      this.renderedNodes[info.path] = info;
      if (trackedByPath.get(info.path)) {
        this.trackedNodes[info.path] = info;
        this.trackedPaths.push(info.path);
      }
    }
  }

  // A branch can be missing the result that names it (parallel runs can drop
  // it), so fall back to whether any of its steps were traced.
  private _hasTracedSteps(pathPrefix: string) {
    return Object.keys(this.trace.trace).some((path) =>
      path.startsWith(pathPrefix)
    );
  }

  // Reaching the last step does not mean it completed or allowed continuation.
  // The prefix includes the trailing slash, e.g. "sequence/0/then/".
  private _branchFinished(pathPrefix: string, steps: Action[]) {
    if (steps.length === 0) {
      return true;
    }

    const lastPath = `${pathPrefix}${steps.length - 1}`;
    const lastTrace = this.trace.trace[lastPath];
    if (!lastTrace?.length) {
      return false;
    }

    const finished = this._actionFinished(steps[steps.length - 1], lastTrace);
    if (finished !== undefined) {
      return finished;
    }

    // A non-error stop propagates through building blocks without adding a
    // parent error. Inspect descendants, since last_step may name a sibling.
    const lastTimestamp = lastTrace[lastTrace.length - 1].timestamp;
    if (
      Object.entries(this.trace.trace).some(
        ([path, records]) =>
          path.startsWith(`${lastPath}/`) &&
          records.some(
            (record) =>
              record.timestamp >= lastTimestamp &&
              "result" in record &&
              record.result &&
              "stop" in record.result &&
              !record.result.error
          )
      )
    ) {
      return false;
    }

    // Core awaits all parallel branches before propagating an error. Once
    // stopped normally, a branch without a local failure completed even if
    // a sibling failed. External cancellation may still interrupt it.
    return (
      (this.trace.state === "stopped" &&
        this.trace.script_execution !== null &&
        ["finished", "aborted", "error"].includes(
          this.trace.script_execution
        )) ||
      this._hasContinuedAfter(lastPath, lastTimestamp)
    );
  }

  // Undefined means the action has no explicit completion result; the caller
  // must check run state or subsequent execution instead.
  private _actionFinished(
    action: Action,
    trace: ActionTraceStep[]
  ): boolean | undefined {
    if (
      trace.some((tr) => tr.error) &&
      !("continue_on_error" in action && action.continue_on_error)
    ) {
      return false;
    }

    const lastRecord = trace[trace.length - 1];
    // Disabled steps are skipped by Core and recorded generically with
    // `result.enabled === false`, regardless of action type.
    if (
      (lastRecord as { result?: { enabled?: boolean } }).result?.enabled ===
      false
    ) {
      return true;
    }

    if ("stop" in action) {
      return false;
    }

    if (
      getAutomationActionType(action) === "condition" &&
      (trace as ConditionTraceStep[]).some((tr) => tr.result?.result === false)
    ) {
      return false;
    }

    if ("wait_template" in action || "wait_for_trigger" in action) {
      if (
        (trace as WaitActionTraceStep[]).some(
          ({ result }) =>
            (result?.timeout && action.continue_on_timeout === false) ||
            (result?.wait?.completed === false &&
              (action.continue_on_timeout === false ||
                result.wait.remaining !== 0))
        )
      ) {
        return false;
      }

      const result = (lastRecord as WaitActionTraceStep).result;
      if (result?.wait || result?.enabled === false) {
        return true;
      }
    }

    if ("delay" in action) {
      const result = (lastRecord as DelayActionTraceStep).result;
      if (result && "done" in result) {
        return result.done;
      }
    }

    return undefined;
  }

  private _hasContinuedAfter(path: string, timestamp: string) {
    // A newer parallel sibling is not evidence of completion. Look for a
    // subsequent action in this sequence or after an ancestor's rejoin.
    const parts = path.split("/");
    for (let index = parts.length - 1; index > 0; index--) {
      if (
        !["action", "sequence", "then", "else", "default"].includes(
          parts[index - 1]
        )
      ) {
        continue;
      }
      const nextPath = `${parts.slice(0, index).join("/")}/${Number(parts[index]) + 1}`;
      const nextTrace = this.trace.trace[nextPath];
      const nextRecord = nextTrace?.[nextTrace.length - 1];
      // Repeats may retain continuation records from an earlier iteration.
      if (nextRecord && nextRecord.timestamp > timestamp) {
        return true;
      }
    }
    return false;
  }
}
