import { createContext } from "@lit/context";
import { ulid } from "ulid";
import { ensureArray } from "../../../../common/array/ensure-array";
import {
  expandConditionWithShorthand,
  flattenTriggers,
} from "../../../../data/automation";
import type {
  AutomationConfig,
  Condition,
  LogicalCondition,
  Trigger,
  TriggerCondition,
} from "../../../../data/automation";
import { getActionType } from "../../../../data/script";
import { isTriggerList } from "../../../../data/trigger";
import type {
  Action,
  ChooseAction,
  IfAction,
  Option,
  ParallelAction,
  RepeatAction,
  SequenceAction,
} from "../../../../data/script";

export const GENERATED_TRIGGER_ID_PREFIX = "generated-";

export interface TriggerIdOption {
  /** Existing ID, or a candidate that is stored on the trigger when selected. */
  id: string;
  trigger: Trigger;
  /** Zero-based position among flattened leaf triggers; list wrappers are excluded. */
  index: number;
  /** The ID is an unstored candidate, not an existing ID with the generated prefix. */
  generated: boolean;
  /** Another leaf trigger has the same nonempty stored ID. */
  duplicate: boolean;
}

/** Controller-provided options and operations for editors, sidebars, and row summaries. */
export interface AutomationTriggerContext {
  options: TriggerIdOption[];
  /** Pass the original condition object so identical conditions remain distinguishable. */
  select: (condition: TriggerCondition, ids: string[]) => void;
  /** Requests confirmation before migrating duplicate IDs throughout the automation. */
  fixDuplicateIds: () => Promise<void>;
}

export const automationTriggerContext =
  createContext<AutomationTriggerContext>("automationTriggers");

/**
 * Identify IDs reserved for automatic UI cleanup by their generated prefix.
 * IDs without this prefix remain user-owned, including references to missing triggers.
 */
export const isGeneratedTriggerId = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith(GENERATED_TRIGGER_ID_PREFIX);

/** Read a leaf trigger's stored ID; list wrappers do not have selectable IDs. */
const getTriggerId = (trigger: Trigger): string | undefined =>
  isTriggerList(trigger) ? undefined : trigger.id;

/** Collect each ID that occurs more than once. */
const duplicateIds = (ids: string[]) =>
  new Set(ids.filter((id, index) => ids.indexOf(id) !== index));

/** Map array items or a truthy scalar, leaving absent or falsy scalar values unchanged. */
const mapScalarOrArray = <T>(
  value: T | T[] | undefined | null,
  mapper: (item: T) => T
): T | T[] | undefined | null => {
  return Array.isArray(value)
    ? value.map(mapper)
    : value
      ? mapper(value)
      : value;
};

/**
 * Generate an ID absent from both sets and reserve it in `generatedIds`.
 * `reservedIds` contains existing IDs that the new ID must not collide with.
 */
const getGeneratedTriggerId = (
  reservedIds: Set<string>,
  generatedIds: Set<string>
): string => {
  let id = `${GENERATED_TRIGGER_ID_PREFIX}${ulid()}`;
  while (reservedIds.has(id) || generatedIds.has(id)) {
    id = `${GENERATED_TRIGGER_ID_PREFIX}${ulid()}`;
  }
  generatedIds.add(id);
  return id;
};

/** Collect nonempty stored leaf IDs, including generated IDs and duplicates. */
const getExplicitTriggerIds = (triggers: Trigger | Trigger[] | undefined) =>
  flattenTriggers(triggers)
    .map(getTriggerId)
    .filter((id): id is string => Boolean(id));

/**
 * Build selectable options in flattened leaf order without modifying the triggers.
 * Each call creates fresh candidates for missing or empty IDs. The controller
 * memoizes the result until the trigger-list reference changes.
 */
export const getTriggerIdOptions = (
  triggers: Trigger | Trigger[] | undefined
): TriggerIdOption[] => {
  const explicitIds = getExplicitTriggerIds(triggers);
  const duplicates = duplicateIds(explicitIds);
  const reservedIds = new Set(explicitIds);
  const generatedIds = new Set<string>();

  return flattenTriggers(triggers).map((trigger, index) => {
    const explicitId = getTriggerId(trigger);
    return {
      id: explicitId || getGeneratedTriggerId(reservedIds, generatedIds),
      trigger,
      index,
      generated: !explicitId,
      duplicate: explicitId ? duplicates.has(explicitId) : false,
    };
  });
};

/**
 * Transform leaf triggers recursively, retaining list wrappers and scalar/array shape.
 * Copy only changed branches; callbacks must return replacements rather than mutate leaves.
 */
const walkLeafTriggers = (
  triggers: Trigger | Trigger[],
  callback: (trigger: Trigger) => Trigger
): Trigger | Trigger[] => {
  if (Array.isArray(triggers)) {
    let changed = false;
    const mapped = triggers.map((trigger) => {
      const result = walkLeafTriggers(trigger, callback) as Trigger;
      if (result !== trigger) {
        changed = true;
      }
      return result;
    });
    return changed ? mapped : triggers;
  }
  if (isTriggerList(triggers)) {
    const newInner = triggers.triggers
      ? (walkLeafTriggers(triggers.triggers, callback) as Trigger | Trigger[])
      : triggers.triggers;
    if (newInner === triggers.triggers) {
      return triggers;
    }
    return { ...triggers, triggers: newInner };
  }
  return callback(triggers);
};

/** Store only selected candidate IDs, matching options to their original trigger objects. */
export const assignGeneratedTriggerIds = (
  triggers: Trigger | Trigger[],
  triggerIdOptions: TriggerIdOption[],
  selectedIds: string | string[]
): Trigger | Trigger[] => {
  const selected = new Set(ensureArray(selectedIds));
  const assignments = new Map<Trigger, string>();

  triggerIdOptions.forEach((option) => {
    if (option.generated && selected.has(option.id)) {
      assignments.set(option.trigger, option.id);
    }
  });

  if (!assignments.size) {
    return triggers;
  }

  return walkLeafTriggers(triggers, (trigger) =>
    assignments.has(trigger)
      ? { ...trigger, id: assignments.get(trigger) }
      : trigger
  );
};

/**
 * Replace, expand, or remove each referenced ID; `undefined` removes a reference.
 * Return the original condition when every mapped ID is unchanged. Otherwise
 * deduplicate IDs and preserve array form, or use it for multiple replacement IDs.
 * An emptied scalar reference becomes an empty string.
 */
const mapReferencedTriggerIds = (
  condition: TriggerCondition,
  mapper: (id: string) => string | string[] | undefined
): TriggerCondition => {
  let changed = false;
  const ids = ensureArray(condition.id).flatMap((id) => {
    const mappedId = mapper(id);
    if (mappedId !== id) {
      changed = true;
    }
    return mappedId ?? [];
  });

  if (!changed) {
    return condition;
  }

  const uniqueIds = Array.from(new Set(ids));
  return {
    ...condition,
    id:
      Array.isArray(condition.id) || uniqueIds.length > 1
        ? uniqueIds
        : uniqueIds[0] || "",
  };
};

/**
 * Update trigger conditions throughout an automation without mutating its input.
 * The traversal follows only schema-defined condition/action fields, preserving
 * shorthand syntax, templates, and arbitrary action data.
 */
class AutomationTriggerConditionMapper {
  /** The callback must return a replacement or the original condition without mutating it. */
  constructor(
    private _update: (condition: TriggerCondition) => TriggerCondition
  ) {}

  /** Return a new configuration with mapped conditions and actions; leave triggers untouched. */
  public map(config: AutomationConfig): AutomationConfig {
    return {
      ...config,
      conditions: this._mapConditions(config.conditions),
      actions: this._mapActions(config.actions) as Action | Action[],
    };
  }

  /** Map conditions while preserving scalar/array form and an absent value. */
  private _mapConditions(conditions: Condition | Condition[] | undefined) {
    return mapScalarOrArray(conditions, this._mapCondition) as
      Condition | Condition[] | undefined;
  }

  /** Apply the update to trigger conditions, descending into logical groups. */
  private _mapCondition = (condition: Condition): Condition => {
    if (typeof condition !== "object" || condition === null) {
      return condition;
    }
    const expanded = expandConditionWithShorthand(condition);
    if (expanded !== condition) {
      const key = Array.isArray(condition.condition)
        ? "condition"
        : expanded.condition;
      return {
        ...condition,
        [key]: this._mapConditions((expanded as LogicalCondition).conditions),
      };
    }
    if (condition.condition === "trigger" && "id" in condition) {
      return this._update(condition);
    }
    if (
      "conditions" in condition &&
      (condition.condition === "and" ||
        condition.condition === "or" ||
        condition.condition === "not")
    ) {
      return {
        ...condition,
        conditions: this._mapConditions(condition.conditions),
      } as LogicalCondition;
    }
    return condition;
  };

  /** Map actions while preserving scalar/array form and an absent value. */
  private _mapActions(actions: Action | Action[] | undefined) {
    return mapScalarOrArray(actions, this._mapAction) as
      Action | Action[] | undefined;
  }

  /** Map a choose branch's conditions and sequence, leaving template strings untouched. */
  private _mapChooseOption = (option: Option): Option => {
    return {
      ...option,
      conditions:
        typeof option.conditions === "string"
          ? option.conditions
          : (this._mapConditions(option.conditions) as Condition[]),
      sequence: this._mapActions(option.sequence) as Action | Action[],
    };
  };

  /** Map condition actions and nested blocks; return other action types unchanged. */
  private _mapAction = (action: Action): Action => {
    switch (getActionType(action)) {
      case "check_condition":
        return this._mapCondition(action as Condition) as Action;
      case "choose": {
        const result = { ...(action as ChooseAction) };
        result.choose = mapScalarOrArray(
          result.choose,
          this._mapChooseOption
        ) as Option | Option[] | null;
        if (result.default) {
          result.default = this._mapActions(result.default);
        }
        return result;
      }
      case "if": {
        const result = { ...(action as IfAction) };
        if (typeof result.if !== "string") {
          result.if = this._mapConditions(result.if) as Condition[];
        }
        result.then = this._mapActions(result.then) as Action | Action[];
        if (result.else) {
          result.else = this._mapActions(result.else);
        }
        return result;
      }
      case "repeat": {
        const repeat = { ...(action as RepeatAction).repeat };
        if ("while" in repeat) {
          repeat.while = this._mapConditions(repeat.while) as Condition[];
        }
        if ("until" in repeat) {
          repeat.until = this._mapConditions(repeat.until) as Condition[];
        }
        repeat.sequence = this._mapActions(repeat.sequence) as
          Action | Action[];
        return { ...action, repeat };
      }
      case "sequence": {
        const result = { ...(action as SequenceAction) };
        result.sequence = this._mapActions(result.sequence as Action[]) as
          Action[] | null;
        return result;
      }
      case "parallel": {
        const result = { ...(action as ParallelAction) };
        result.parallel = this._mapActions(result.parallel as Action[]) as
          Action | Action[];
        return result;
      }
      default:
        return action;
    }
  };
}

/**
 * Build a configuration with the supplied triggers and replace the selected condition
 * by object identity throughout conditions and actions. The controller commits it.
 */
export const updateTriggerCondition = (
  config: AutomationConfig,
  original: TriggerCondition,
  updated: TriggerCondition,
  triggers: Trigger | Trigger[]
): AutomationConfig => {
  /** Replace only the selected object, even when another condition has equal values. */
  const replace = (condition: TriggerCondition) =>
    condition === original ? updated : condition;
  return {
    ...new AutomationTriggerConditionMapper(replace).map(config),
    triggers,
  };
};

/**
 * Reconcile generated trigger IDs in both directions:
 * - Remove trigger-condition references to generated IDs missing from the trigger list.
 * - Remove generated IDs from triggers not referenced by any trigger condition.
 * IDs without the generated prefix are left untouched. Templates and arbitrary
 * action data do not count as references because they are not inspected.
 *
 * The configuration must already contain the updated trigger list.
 * Return the original configuration when no IDs or references need removal.
 */
export const cleanupTriggerIds = (
  config: AutomationConfig
): AutomationConfig => {
  const triggerIds = new Set(getExplicitTriggerIds(config.triggers));
  const referencedIds = new Set<string>();
  let refsChanged = false;
  /** Record a reference and remove it only if its generated ID has no trigger. */
  const cleanRef = (id: string) => {
    referencedIds.add(id);
    if (isGeneratedTriggerId(id) && !triggerIds.has(id)) {
      refsChanged = true;
      return undefined;
    }
    return id;
  };
  const updated = new AutomationTriggerConditionMapper((condition) =>
    mapReferencedTriggerIds(condition, cleanRef)
  ).map(config);

  let triggersChanged = false;
  const newTriggers = walkLeafTriggers(config.triggers, (trigger) => {
    if (
      isTriggerList(trigger) ||
      !trigger.id ||
      !isGeneratedTriggerId(trigger.id) ||
      referencedIds.has(trigger.id)
    ) {
      return trigger;
    }
    triggersChanged = true;
    const { id: _id, ...rest } = trigger;
    return rest as Trigger;
  });

  if (!refsChanged && !triggersChanged) {
    return config;
  }
  return {
    ...(refsChanged ? updated : config),
    triggers: newTriggers,
  };
};

/**
 * Assign a fresh generated ID to every leaf sharing a stored ID, including manual IDs.
 * Expand trigger-condition references to all replacements for the old ID, preserving
 * their original "any of these triggers" meaning. Return the original config if IDs are unique.
 * Templates and action data that inspect trigger.id directly are not rewritten;
 * the controller's confirmation dialog warns about that limitation.
 */
export const makeDuplicateTriggerIdsUnique = (
  config: AutomationConfig
): AutomationConfig => {
  const ids = getExplicitTriggerIds(config.triggers);
  const duplicates = duplicateIds(ids);

  if (!duplicates.size) {
    return config;
  }

  const reservedIds = new Set(ids.filter((id) => !duplicates.has(id)));
  const generatedIds = new Set<string>();
  const assignments = new Map<Trigger, string>();
  const replacementIds = new Map<string, string[]>();

  // A duplicate ID used to mean "any of these triggers". After assigning each
  // trigger its own ID, references to the old ID must expand to every new ID.
  flattenTriggers(config.triggers).forEach((trigger) => {
    const id = getTriggerId(trigger);
    if (!id || !duplicates.has(id)) {
      return;
    }
    const generatedId = getGeneratedTriggerId(reservedIds, generatedIds);
    assignments.set(trigger, generatedId);
    replacementIds.set(id, [...(replacementIds.get(id) || []), generatedId]);
  });

  return {
    ...new AutomationTriggerConditionMapper((condition) =>
      mapReferencedTriggerIds(condition, (id) => replacementIds.get(id) ?? id)
    ).map(config),
    triggers: walkLeafTriggers(config.triggers, (trigger) =>
      assignments.has(trigger)
        ? { ...trigger, id: assignments.get(trigger) }
        : trigger
    ) as Trigger | Trigger[],
  };
};
