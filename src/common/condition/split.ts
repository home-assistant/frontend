import type { Condition as CoreCondition } from "../../data/automation";
import type { VisibilityCondition } from "../../panels/lovelace/common/validate-condition";
import {
  isLogicalCondition,
  isServerCondition,
  translateToCoreCondition,
} from "./translate";

/** A maximal server subtree, to be opened as one `subscribe_condition`. */
export interface ServerSubtree {
  id: string;
  coreCondition: CoreCondition;
}

/**
 * Evaluate a single client-only condition leaf (`screen`, `user`,
 * `view_columns`, `location`, `time`). Returns `undefined` when the outcome is
 * not yet determinable (e.g. context not available).
 */
export type ClientConditionEvaluator = (
  condition: VisibilityCondition
) => boolean | undefined;

/** Server subtree results keyed by {@link ServerSubtree.id}; `undefined` = not yet reported. */
export type ServerConditionResults = Record<string, boolean | undefined>;

export interface SplitConditionTree {
  /** Maximal server subtrees, each to be opened as one `subscribe_condition`. */
  serverSubtrees: ServerSubtree[];
  /**
   * Combine client + server results into the overall visibility using
   * three-valued (Kleene) logic. Returns `undefined` while the outcome still
   * depends on a server subtree that has not reported yet.
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

// Three-valued logic combinators (true / false / undefined = unknown). `false`
// dominates AND and `true` dominates OR regardless of any unknown sibling.
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

/**
 * Split a dashboard visibility condition tree into:
 *
 * - a flat list of **maximal server subtrees** (`serverSubtrees`), each
 *   translated to core format and meant to back one `subscribe_condition`; and
 * - an **`evaluate`** function that recombines those subtree results with
 *   locally-evaluated client leaves into the overall visibility.
 *
 * The top-level array is treated as an implicit `AND`. Sibling server
 * conditions sharing a logical parent (including that implicit top-level AND)
 * are grouped into a *single* subscription using the parent's operator, to
 * avoid subscription fan-out. A `not` combines its children with `AND` before
 * negating, matching lovelace `not` semantics (¬(AND of children)).
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

  // Partition children into client/server, group the server siblings into one
  // subscription, and recurse into the client ones. `groupOperator` is the
  // operator used to combine the grouped server siblings.
  const buildSiblings = (
    children: VisibilityCondition[],
    groupOperator: "and" | "or"
  ): EvalNode[] => {
    const serverChildren: VisibilityCondition[] = [];
    const clientChildren: VisibilityCondition[] = [];
    for (const child of children) {
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

  // Only ever reached for client-class nodes (server subtrees are grouped and
  // translated whole by `buildSiblings`).
  const build = (condition: VisibilityCondition): EvalNode => {
    if (isLogicalCondition(condition)) {
      const children = condition.conditions ?? [];
      if (condition.condition === "or") {
        return orNode(buildSiblings(children, "or"));
      }
      if (condition.condition === "not") {
        return notNode(andNode(buildSiblings(children, "and")));
      }
      return andNode(buildSiblings(children, "and"));
    }
    // Defensive: a server leaf reaching here still becomes a subscription.
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
