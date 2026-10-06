import { ContextProvider, createContext } from "@lit/context";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { LitElement } from "lit";
import { ensureArray } from "../../../../common/array/ensure-array";
import { isTemplate } from "../../../../common/string/has-template";
import type { AutomationConfig } from "../../../../data/automation";
import {
  TARGET_SEPARATOR,
  type SingleHassServiceTarget,
} from "../../../../data/target";
import type { AddAutomationElementDialogParams } from "../show-add-automation-element-dialog";

type AutomationElementType = AddAutomationElementDialogParams["type"];

type ElementTargets = Record<AutomationElementType, SingleHassServiceTarget[]>;

export interface RecentTarget {
  type: AutomationElementType;
  target: SingleHassServiceTarget;
}

export interface AutomationTargetSuggestions {
  /** Ranked candidates, not yet checked against the registries. */
  getSuggestedTargets: (
    type: AutomationElementType
  ) => SingleHassServiceTarget[];
  rememberTarget: (
    type: AutomationElementType,
    target: HassServiceTarget
  ) => void;
}

export const automationTargetSuggestionsContext =
  createContext<AutomationTargetSuggestions>("automationTargetSuggestions");

const ELEMENT_TYPES: AutomationElementType[] = [
  "trigger",
  "condition",
  "action",
];

const TARGET_KEYS = new Set<string>([
  "entity_id",
  "device_id",
  "area_id",
  "floor_id",
  "label_id",
]);

const CONDITION_KEYS = new Set(["conditions", "if", "while", "until"]);

const ACTION_KEYS = new Set([
  "actions",
  "sequence",
  "then",
  "else",
  "default",
  "parallel",
]);

const MAX_RECENT_TARGETS = 10;

const targetKey = (target: SingleHassServiceTarget) =>
  Object.entries(target)
    .map(([key, id]) => `${key}${TARGET_SEPARATOR}${id}`)
    .join();

const toSingleTargets = (
  target: HassServiceTarget
): SingleHassServiceTarget[] =>
  Object.entries(target)
    .filter(([key]) => TARGET_KEYS.has(key))
    .flatMap(([key, ids]) =>
      ensureArray(ids as string | string[] | undefined)
        .filter((id) => typeof id === "string" && id && !isTemplate(id))
        .map((id) => ({ [key]: id }))
    );

const collectTargets = (
  node: unknown,
  type: AutomationElementType,
  found: ElementTargets
) => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectTargets(item, type, found));
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }
  found[type].push(...toSingleTargets(node as HassServiceTarget));
  Object.entries(node).forEach(([key, value]) => {
    if (TARGET_KEYS.has(key)) {
      return;
    }
    collectTargets(
      value,
      CONDITION_KEYS.has(key)
        ? "condition"
        : ACTION_KEYS.has(key)
          ? "action"
          : type,
      found
    );
  });
};

/** Collect targets referenced in an automation, grouped by the element type that uses them. */
export const getAutomationTargets = (
  config: AutomationConfig
): ElementTargets => {
  const found: ElementTargets = { trigger: [], condition: [], action: [] };
  collectTargets(config.triggers, "trigger", found);
  collectTargets(config.conditions, "condition", found);
  collectTargets(config.actions, "action", found);
  return found;
};

/**
 * Rank recently used targets before targets already in the automation.
 * Within both groups, targets used by the same element type come first.
 */
export const rankSuggestedTargets = (
  type: AutomationElementType,
  recent: RecentTarget[],
  automationTargets: ElementTargets
): SingleHassServiceTarget[] => {
  const typeOrder = [type, ...ELEMENT_TYPES.filter((t) => t !== type)];
  const candidates = [
    ...typeOrder.flatMap((t) =>
      recent.filter((item) => item.type === t).map((item) => item.target)
    ),
    // The newest elements are usually at the end of each list.
    ...typeOrder.flatMap((t) => [...automationTargets[t]].reverse()),
  ];
  const seen = new Set<string>();
  return candidates.filter((target) => {
    const key = targetKey(target);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** Keeps the last used targets for as long as the editor exists. */
export class AutomationTargetSuggestionsController {
  private _recent: RecentTarget[] = [];

  constructor(
    host: LitElement,
    private _getConfig: () => AutomationConfig | undefined
  ) {
    new ContextProvider(host, {
      context: automationTargetSuggestionsContext,
      initialValue: {
        getSuggestedTargets: this._getSuggestedTargets,
        rememberTarget: this._rememberTarget,
      },
    });
  }

  private _getSuggestedTargets = (type: AutomationElementType) => {
    const config = this._getConfig();
    return rankSuggestedTargets(
      type,
      this._recent,
      config
        ? getAutomationTargets(config)
        : { trigger: [], condition: [], action: [] }
    );
  };

  private _rememberTarget = (
    type: AutomationElementType,
    target: HassServiceTarget
  ) => {
    const used = toSingleTargets(target).map((single) => ({
      type,
      target: single,
    }));
    const usedKeys = new Set(
      used.map((item) => `${item.type}${targetKey(item.target)}`)
    );
    this._recent = [
      ...used,
      ...this._recent.filter(
        (item) => !usedKeys.has(`${item.type}${targetKey(item.target)}`)
      ),
    ].slice(0, MAX_RECENT_TARGETS);
  };
}
