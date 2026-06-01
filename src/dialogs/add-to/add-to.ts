import { computeDomain } from "../../common/entity/compute_domain";
import { navigate } from "../../common/navigate";
import { createSearchParam } from "../../common/url/search-params";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import { SCENE_IGNORED_DOMAINS, type SceneEntities } from "../../data/scene";
import type { SingleHassServiceTarget } from "../../data/target";
import {
  ADD_AUTOMATION_ELEMENT_AREA_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_QUERY_PARAM,
} from "../../panels/config/automation/show-add-automation-element-dialog";
import type { HomeAssistant, TranslationDict } from "../../types";

/** Add to action keys are the keys of the translation dictionary for the add to actions. */
export type AddToActionKey =
  TranslationDict["ui"]["dialogs"]["more_info_control"]["add_to"]["actions"] extends infer Actions
    ? keyof Actions
    : never;

export type AddToAutomationScriptActionKey = Exclude<AddToActionKey, "scene">;

/** Fully-qualified localize key for an add to action name. */
type AddToActionNameKey =
  `ui.dialogs.more_info_control.add_to.actions.${AddToActionKey}`;

interface BaseEntityAddToAction {
  /** Whether the action is enabled and can be selected. */
  enabled: boolean;
  /** Translated name of the action */
  name?: string;
  /** Fully-qualified localize key for the action name */
  nameKey?: AddToActionNameKey;
  /** Optional translated description of the action */
  description?: string;
  /** MDI icon name (e.g., "mdi:car") */
  icon: string;
}

export interface DefaultEntityAddToAction extends BaseEntityAddToAction {
  /** Type of action handled in the frontend */
  type: "default";
  /** Stable key used to resolve the action handler */
  key: AddToAutomationScriptActionKey;
}

export interface ExternalEntityAddToAction extends BaseEntityAddToAction {
  /** Type of action. External is handled by external apps instead of in the frontend */
  type: "external";
  /** Opaque payload for external action handling */
  payload?: string;
}

export type EntityAddToAction =
  | DefaultEntityAddToAction
  | ExternalEntityAddToAction;

export type EntityAddToActions = EntityAddToAction[];

interface ActionDefinition {
  translation_key: AddToAutomationScriptActionKey;
  icon: string;
}

const DEFAULT_ACTION_DEFS: ActionDefinition[] = [
  {
    translation_key: "automation_trigger",
    icon: "mdi:robot-outline",
  },
  {
    translation_key: "automation_condition",
    icon: "mdi:playlist-check",
  },
  {
    translation_key: "automation_action",
    icon: "mdi:play-circle-outline",
  },
  {
    translation_key: "script_action",
    icon: "mdi:script-text-outline",
  },
];

export const getDefaultAddToActions = (): EntityAddToActions =>
  DEFAULT_ACTION_DEFS.map(
    (def: ActionDefinition): EntityAddToAction => ({
      type: "default",
      key: def.translation_key,
      enabled: true,
      nameKey: `ui.dialogs.more_info_control.add_to.actions.${def.translation_key}`,
      icon: def.icon,
    })
  );

export const createAddToSceneEntities = (
  entityIds: string[]
): SceneEntities => {
  const entities: SceneEntities = {};
  for (const entityId of entityIds) {
    entities[entityId] = "";
  }
  return entities;
};

export const filterAddToSceneEntityIds = (
  entityIds: string[],
  entityRegistry: readonly EntityRegistryEntry[],
  states: HomeAssistant["states"]
): string[] => {
  const entityIdSet = new Set(entityIds);

  return entityRegistry
    .filter((entry) => entityIdSet.has(entry.entity_id))
    .filter(
      (entry) =>
        !entry.entity_category &&
        !entry.hidden_by &&
        !SCENE_IGNORED_DOMAINS.includes(computeDomain(entry.entity_id)) &&
        Boolean(states[entry.entity_id])
    )
    .map((entry) => entry.entity_id);
};

/** Handler for adding a target to an automation/script. */
export function addToActionHandler(
  key: AddToAutomationScriptActionKey,
  target: SingleHassServiceTarget
): Promise<boolean> {
  const searchParams: Record<string, string> = {};

  if (target.entity_id) {
    searchParams[ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM] = target.entity_id;
  } else if (target.device_id) {
    searchParams[ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM] = target.device_id;
  } else if (target.area_id) {
    searchParams[ADD_AUTOMATION_ELEMENT_AREA_TARGET_PARAM] = target.area_id;
  }

  const params = (addElement: string) =>
    `?${createSearchParam({
      [ADD_AUTOMATION_ELEMENT_QUERY_PARAM]: addElement,
      ...searchParams,
    })}`;

  switch (key) {
    case "automation_trigger":
      return navigate(`/config/automation/edit/new${params("trigger")}`);
    case "automation_condition":
      return navigate(`/config/automation/edit/new${params("condition")}`);
    case "automation_action":
      return navigate(`/config/automation/edit/new${params("action")}`);
    case "script_action":
      return navigate(`/config/script/edit/new${params("action")}`);
    default:
      return Promise.reject(new Error(`Unknown action key ${key}`));
  }
}
