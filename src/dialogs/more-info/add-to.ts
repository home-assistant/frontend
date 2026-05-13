import { navigate } from "../../common/navigate";
import { createSearchParam } from "../../common/url/search-params";
import {
  ADD_AUTOMATION_ELEMENT_QUERY_PARAM,
  ADD_AUTOMATION_ELEMENT_TARGET_PARAM,
} from "../../panels/config/automation/show-add-automation-element-dialog";
import type { HomeAssistant, TranslationDict } from "../../types";

type DefaultActionKey =
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
  key: DefaultActionKey;
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
  translation_key: DefaultActionKey;
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
  hass: HomeAssistant,
  entityId: string
): EntityAddToActions =>
  DEFAULT_ACTION_DEFS.map(
    (def: ActionDefinition): EntityAddToAction => ({
      type: "default",
      key: def.translation_key,
      enabled: true,
      name: hass.localize(
        `ui.dialogs.more_info_control.add_to.actions.${def.translation_key}`,
        {
          entity:
            hass.states[entityId] !== undefined
              ? hass.formatEntityName(hass.states[entityId], undefined)
              : entityId,
        }
      ),
      icon: def.icon,
    })
  );

export function defaultActionHandler(
  key: (typeof DEFAULT_ACTION_DEFS)[number]["translation_key"],
  entityId: string
): Promise<boolean> {
  const params = (addElement: string) =>
    `?${createSearchParam({
      [ADD_AUTOMATION_ELEMENT_QUERY_PARAM]: addElement,
      [ADD_AUTOMATION_ELEMENT_TARGET_PARAM]: entityId,
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
