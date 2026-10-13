import type { Condition as CoreCondition } from "../../data/automation";
import type { VisibilityCondition } from "../../panels/lovelace/common/validate-condition";
import {
  isDisabledCondition,
  isLogicalCondition,
  isServerCondition,
  logicalChildren,
  translateToCoreCondition,
} from "./translate";

/** One `subscribe_condition` (largest server subtree we can group). */
export interface ServerSubtree {
  id: string;
  coreCondition: CoreCondition;
}

/** Evaluate a client-only leaf. `undefined` if it cannot be decided yet. */
export type ClientConditionEvaluator = (
  condition: VisibilityCondition
) => boolean | undefined;

/** Results by subtree id. `undefined` means not reported yet. */
export type ServerConditionResults = Record<string, boolean | undefined>;

export interface SplitConditionTree {
  serverSubtrees: ServerSubtree[];
  /**
   * Combine client and server results. Returns `undefined` while a needed
   * server subtree has not reported.
   */
  evaluate: (
    clientEvaluator: ClientConditionEvaluator,
    serverResults: ServerConditionResults
  ) => boolean | undefined;
}

type EvalNode = (
  clientEvaluator: ClientConditionEvaluator,
  serverResults: ServerConditionResults
) => boolean | undefined;

// false wins AND, true wins OR, even if a sibling is still unknown.
const andNode =
  (children: EvalNode[]): EvalNode =>
  (clientEvaluator, serverResults) => {
    let unknown = false;
    for (const child of children) {
      const value = child(clientEvaluator, serverResults);
      if (value === false) return false;
      if (value === undefined) unknown = true;
    }
    return unknown ? undefined : true;
  };

const orNode =
  (children: EvalNode[]): EvalNode =>
  (clientEvaluator, serverResults) => {
    let unknown = false;
    for (const child of children) {
      const value = child(clientEvaluator, serverResults);
      if (value === true) return true;
      if (value === undefined) unknown = true;
    }
    return unknown ? undefined : false;
  };

const notNode =
  (child: EvalNode): EvalNode =>
  (clientEvaluator, serverResults) => {
    const value = child(clientEvaluator, serverResults);
    return value === undefined ? undefined : !value;
  };

const serverLeaf =
  (id: string): EvalNode =>
  (_clientEvaluator, serverResults) =>
    serverResults[id];

const clientLeaf =
  (condition: VisibilityCondition): EvalNode =>
  (clientEvaluator) =>
    clientEvaluator(condition);

const unknownLeaf: EvalNode = () => undefined;

/**
 * Split a visibility tree into server subscriptions and a local combiner.
 *
 * Sibling server conditions under the same parent share one subscription.
 * `enabled: false` is skipped. A template `enabled` on a client node stays
 * unknown. Lovelace `not` is NOT(AND of children).
 */
export const splitConditionTree = (
  conditions: VisibilityCondition[]
): SplitConditionTree => {
  const serverSubtrees: ServerSubtree[] = [];
  let nextId = 0;

  const addSubtree = (coreCondition: CoreCondition): EvalNode => {
    const id = String(nextId);
    nextId += 1;
    serverSubtrees.push({ id, coreCondition });
    return serverLeaf(id);
  };

  // Group server siblings into one subscription; recurse into client children.
  const buildSiblings = (
    children: VisibilityCondition[],
    groupOperator: "and" | "or"
  ): EvalNode[] => {
    const serverChildren: VisibilityCondition[] = [];
    const clientChildren: VisibilityCondition[] = [];
    for (const child of children) {
      // Core skips disabled nodes; don't subscribe or combine them.
      if (isDisabledCondition(child)) {
        continue;
      }
      (isServerCondition(child) ? serverChildren : clientChildren).push(child);
    }

    const nodes: EvalNode[] = [];

    if (serverChildren.length === 1) {
      nodes.push(addSubtree(translateToCoreCondition(serverChildren[0])));
    } else if (serverChildren.length > 1) {
      nodes.push(
        addSubtree({
          condition: groupOperator,
          conditions: serverChildren.map(translateToCoreCondition),
        })
      );
    }

    for (const child of clientChildren) {
      nodes.push(build(child));
    }

    return nodes;
  };

  const build = (condition: VisibilityCondition): EvalNode => {
    // Template `enabled` on a client node can't be rendered here; stay unknown.
    if ("enabled" in condition && typeof condition.enabled !== "boolean") {
      return unknownLeaf;
    }
    if (isLogicalCondition(condition)) {
      const children = logicalChildren(condition);
      if (condition.condition === "or") {
        return orNode(buildSiblings(children, "or"));
      }
      if (condition.condition === "not") {
        return notNode(andNode(buildSiblings(children, "and")));
      }
      return andNode(buildSiblings(children, "and"));
    }
    // Should only happen if a server leaf slipped past grouping.
    if (isServerCondition(condition)) {
      return addSubtree(translateToCoreCondition(condition));
    }
    return clientLeaf(condition);
  };

  const root = andNode(buildSiblings(conditions, "and"));

  return {
    serverSubtrees,
    evaluate: (clientEvaluator, serverResults) =>
      root(clientEvaluator, serverResults),
  };
};
