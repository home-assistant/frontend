import { navigate } from "../../common/navigate";
import { createSearchParam } from "../../common/url/search-params";
import {
  ADD_AUTOMATION_ELEMENT_QUERY_PARAM,
  ADD_AUTOMATION_ELEMENT_TARGET_PARAM,
} from "../../panels/config/automation/show-add-automation-element-dialog";
import type { HomeAssistant, TranslationDict } from "../../types";

export interface EntityAddToAction {
  /** Type of action. External is handled by external apps instead of in the frontend */
  type: "default" | "external";
  /** Whether the action is enabled and can be selected. */
  enabled: boolean;
  /** Translated name of the action */
  name: string;
  /** Optional translated description of the action */
  description?: string;
  /** MDI icon name (e.g., "mdi:car") */
  icon: string;
  /** Opaque payload for external action handling */
  payload?: string;
}

export type EntityAddToActions = EntityAddToAction[];

interface ActionDefinition {
  translation_key: keyof TranslationDict["ui"]["dialogs"]["more_info_control"]["add_to"]["actions"];
  icon: string;
}

export const DEFAULT_ACTION_DEFS: ActionDefinition[] = [
  {
    translation_key: "automation",
    icon: "mdi:robot-outline",
  },
  {
    translation_key: "condition",
    icon: "mdi:playlist-check",
  },
  {
    translation_key: "script",
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
) {
  const params = (addElement: string) =>
    `?${createSearchParam({
      [ADD_AUTOMATION_ELEMENT_QUERY_PARAM]: addElement,
      [ADD_AUTOMATION_ELEMENT_TARGET_PARAM]: entityId,
    })}`;

  switch (key) {
    case "automation":
      navigate(`/config/automation/edit/new${params("trigger")}`);
      break;
    case "condition":
      navigate(`/config/automation/edit/new${params("condition")}`);
      break;
    case "script":
      navigate(`/config/script/edit/new${params("action")}`);
      break;
  }
}
