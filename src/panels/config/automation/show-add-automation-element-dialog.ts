import type { HassServiceTarget } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import type { SingleHassServiceTarget } from "../../../data/target";
import type { HomeAssistant } from "../../../types";

export const PASTE_VALUE = "__paste__";

export const ADD_AUTOMATION_ELEMENT_QUERY_PARAM = "add_automation_element";
export const ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM = "target_entity_id";
export const ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM = "target_device_id";

/** Parameters for the add automation element dialog. */
export interface AddAutomationElementDialogParams {
  type: "trigger" | "condition" | "action";
  add: (key: string, target?: HassServiceTarget) => void;
  clipboardItem: string | undefined;
  clipboardPasteToastBottomOffset?: number;
}

/** Get the target from the query parameters. */
export const getAddAutomationElementTargetFromQuery = (
  states: HomeAssistant["states"],
  devices: HomeAssistant["devices"],
  type: AddAutomationElementDialogParams["type"]
): SingleHassServiceTarget | undefined => {
  const params = new URLSearchParams(window.location.search);

  if (params.get(ADD_AUTOMATION_ELEMENT_QUERY_PARAM) !== type) {
    return undefined;
  }

  const entityId = params.get(ADD_AUTOMATION_ELEMENT_ENTITY_TARGET_PARAM);
  if (entityId && states[entityId]) {
    return { entity_id: entityId };
  }

  const deviceId = params.get(ADD_AUTOMATION_ELEMENT_DEVICE_TARGET_PARAM);
  if (deviceId && devices[deviceId]) {
    return { device_id: deviceId };
  }

  return undefined;
};

const loadDialog = () => import("./add-automation-element-dialog");

/** Show the add automation element dialog. */
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
