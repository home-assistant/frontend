import { navigate } from "../../common/navigate";
import type { LocalizeFunc } from "../../common/translations/localize";
import { createSearchParam } from "../../common/url/search-params";
import type { SingleHassServiceTarget } from "../../data/target";
import {
  ADD_AUTOMATION_ELEMENT_AREA_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM,
  ADD_AUTOMATION_ELEMENT_QUERY_PARAM,
  ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM,
} from "../../panels/config/automation/show-add-automation-element-dialog";
import type { HomeAssistant, TranslationDict } from "../../types";

/** Add to action keys are the keys of the translation dictionary for the add to actions. */
export type AddToActionKey =
  TranslationDict["ui"]["dialogs"]["more_info_control"]["add_to"]["actions"] extends infer Actions
    ? keyof Actions
    : never;

interface BaseEntityAddToAction {
  /** Whether the action is enabled and can be selected. */
  enabled: boolean;
  /** Translated name of the action */
  name: string;
  /** Optional translated description of the action */
  description?: string;
  /** MDI icon name (e.g., "mdi:car") */
  icon: string;
}

export interface DefaultEntityAddToAction extends BaseEntityAddToAction {
  /** Type of action handled in the frontend */
  type: "default";
  /** Stable key used to resolve the action handler */
  key: AddToActionKey;
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
  translation_key: AddToActionKey;
  icon: string;
}

export const DEFAULT_ACTION_DEFS: ActionDefinition[] = [
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

export const getDefaultAddToActions = (
  states: HomeAssistant["states"],
  localize: LocalizeFunc,
  formatEntityName: HomeAssistant["formatEntityName"],
  entityId: string
): EntityAddToActions =>
  DEFAULT_ACTION_DEFS.map(
    (def: ActionDefinition): EntityAddToAction => ({
      type: "default",
      key: def.translation_key,
      enabled: true,
      name: localize(
        `ui.dialogs.more_info_control.add_to.actions.${def.translation_key}`,
        {
          target:
            states[entityId] !== undefined
              ? formatEntityName(states[entityId], undefined)
              : entityId,
        }
      ),
      icon: def.icon,
    })
  );

/** Handler for adding a target to an automation/script. */
export function addToActionHandler(
  key: AddToActionKey,
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
