import type { HassServiceTarget } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../types";

export const PASTE_VALUE = "__paste__";

export const ADD_AUTOMATION_ELEMENT_QUERY_PARAM = "add_automation_element";
export const ADD_AUTOMATION_ELEMENT_TARGET_PARAM = "target_entity_id";

export interface AddAutomationElementDialogParams {
  type: "trigger" | "condition" | "action";
  add: (key: string, target?: HassServiceTarget) => void;
  clipboardItem: string | undefined;
  clipboardPasteToastBottomOffset?: number;
}
const loadDialog = () => import("./add-automation-element-dialog");

export const getAddAutomationElementTargetFromQuery = (
  hass: HomeAssistant,
  type: AddAutomationElementDialogParams["type"]
): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const entityId = params.get(ADD_AUTOMATION_ELEMENT_TARGET_PARAM);

  return params.get(ADD_AUTOMATION_ELEMENT_QUERY_PARAM) === type &&
    entityId &&
    hass.states[entityId]
    ? entityId
    : undefined;
};

export const showAddAutomationElementDialog = (
  element: HTMLElement,
  dialogParams: AddAutomationElementDialogParams
): void => {
  const params = new URLSearchParams(window.location.search);
  fireEvent(element, "show-dialog", {
    dialogTag: "add-automation-element-dialog",
    dialogImport: loadDialog,
    dialogParams,
    addHistory:
      params.get(ADD_AUTOMATION_ELEMENT_QUERY_PARAM) !== dialogParams.type,
  });
};
