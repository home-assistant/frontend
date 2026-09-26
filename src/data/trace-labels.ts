import { ensureArray } from "../common/array/ensure-array";
import type { HomeAssistant } from "../types";
import type { Condition, Trigger } from "./automation";
import { describeCondition, describeTrigger } from "./automation_i18n";
import type { EntityRegistryEntry } from "./entity/entity_registry";
import type { DomainManifestLookup } from "./integration";
import { describeAction } from "./script_i18n";
import type { TraceExtended } from "./trace";
import { TraceTree } from "./trace-tree";
import type { TraceActionNode, TraceBranch, TraceNode } from "./trace-tree";

const STATE_KEY = "ui.panel.config.automation.trace.graph.state";

/** Shared so an absent registry does not break the callers' memoization. */
const NO_ENTITY_REGISTRY: EntityRegistryEntry[] = [];

interface LabelContext {
  hass: HomeAssistant;
  entityRegistry: EntityRegistryEntry[];
  manifests?: DomainManifestLookup;
}

type StatefulNode = Pick<TraceNode, "disabled" | "error" | "track"> &
  Partial<Pick<TraceNode, "notTriggered" | "condition">>;

/**
 * Whether a condition passed is drawn as the tracked path, and failing as a
 * cross on a node that is aria-hidden, so the outcome needs saying. A repeated
 * condition can have done both across its evaluations.
 */
const conditionOutcome = (
  condition: NonNullable<TraceNode["condition"]>
): "passed" | "failed" | "passed_and_failed" | undefined => {
  if (condition.passed && condition.failed) {
    return "passed_and_failed";
  }
  if (condition.passed) {
    return "passed";
  }
  if (condition.failed) {
    return "failed";
  }
  return undefined;
};

/** The graph shows the run outcome only visually, so the label says it. */
const withState = (
  { hass }: LabelContext,
  description: string,
  node: StatefulNode,
  badge?: number
): string => {
  const outcome = node.condition && conditionOutcome(node.condition);
  let state: string;
  if (node.disabled) {
    state = hass.localize(`${STATE_KEY}.disabled`);
  } else if (node.error) {
    state = hass.localize(`${STATE_KEY}.error`);
  } else if (node.notTriggered) {
    state = hass.localize(`${STATE_KEY}.not_triggered`);
  } else if (outcome) {
    state = hass.localize(`${STATE_KEY}.${outcome}`);
  } else if (node.track && badge) {
    state = hass.localize(`${STATE_KEY}.repeated`, { count: badge });
  } else if (node.track) {
    state = hass.localize(`${STATE_KEY}.executed`);
  } else {
    state = hass.localize(`${STATE_KEY}.not_executed`);
  }
  return hass.localize("ui.panel.config.automation.trace.graph.node_label", {
    description,
    state,
  });
};

/** Named by its first condition, as `ha-automation-option-row` does. */
const optionLabel = (ctx: LabelContext, branch: TraceBranch): string => {
  const conditions = branch.option?.conditions
    ? ensureArray<Condition | string>(branch.option.conditions)
    : undefined;
  let description: string;
  if (!conditions || conditions.length === 0) {
    description = ctx.hass.localize(
      "ui.panel.config.automation.editor.actions.type.choose.no_conditions"
    );
  } else if (typeof conditions[0] === "string") {
    description = conditions[0];
  } else {
    description = describeCondition(
      conditions[0],
      ctx.hass,
      ctx.entityRegistry
    );
  }
  if (conditions && conditions.length > 1) {
    description += ctx.hass.localize(
      "ui.panel.config.automation.editor.actions.type.choose.option_description_additional",
      { numberOfAdditionalConditions: conditions.length - 1 }
    );
  }
  return withState(ctx, description, {
    disabled: branch.disabled,
    error: false,
    track: branch.hasTrace,
  });
};

const addAction = (
  ctx: LabelContext,
  labels: Record<string, string>,
  node: TraceActionNode
): void => {
  labels[node.path] = withState(
    ctx,
    // The tree's `actionType` is a wider union than describeAction accepts;
    // it derives the type from the config anyway.
    describeAction(
      ctx.hass,
      ctx.entityRegistry,
      node.config,
      undefined,
      undefined,
      ctx.manifests
    ),
    node,
    node.badge
  );
  for (const branch of node.branches) {
    // Only `choose` branches carry an option, which gets a node of its own.
    if (branch.option) {
      labels[branch.path] = optionLabel(ctx, branch);
    }
    for (const child of branch.children) {
      addAction(ctx, labels, child);
    }
  }
};

/**
 * Accessible names for every step of a trace, keyed by node path. Called from
 * the trace panels, which own `hass`; memoize on everything but `hass`, which
 * is replaced on every state update.
 */
export const buildTraceLabels = (
  trace: TraceExtended,
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[] | undefined,
  manifests?: DomainManifestLookup
): Record<string, string> => {
  const entities = entityRegistry ?? NO_ENTITY_REGISTRY;
  const ctx: LabelContext = { hass, entityRegistry: entities, manifests };
  const tree = new TraceTree(trace);
  const labels: Record<string, string> = {};

  tree.triggers?.forEach((node: TraceNode<Trigger>) => {
    labels[node.path] = withState(
      ctx,
      describeTrigger(node.config, hass, entities),
      node
    );
  });
  tree.conditions.forEach((node: TraceNode<Condition>) => {
    labels[node.path] = withState(
      ctx,
      describeCondition(node.config, hass, entities),
      node
    );
  });
  tree.actions.forEach((node) => addAction(ctx, labels, node));
  tree.sequence.forEach((node) => addAction(ctx, labels, node));

  return labels;
};
