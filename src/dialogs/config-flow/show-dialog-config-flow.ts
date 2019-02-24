import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";

export interface HaConfigFlowParams {
  hass: HomeAssistant;
  continueFlowId?: string;
  newFlowForHandler?: string;
  dialogClosedCallback: (params: { flowFinished: boolean }) => void;
}

export const loadConfigFlowDialog = () =>
  import(/* webpackChunkName: "dialog-config-flow" */ "./dialog-config-flow");

export const showConfigFlowDialog = (
  element: HTMLElement,
  dialogParams: HaConfigFlowParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-config-flow",
    dialogImport: loadConfigFlowDialog,
    dialogParams,
  });
};
