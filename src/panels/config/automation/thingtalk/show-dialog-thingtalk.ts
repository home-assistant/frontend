import { fireEvent } from "../../../../common/dom/fire_event";
import { AutomationConfig } from "../../../../data/automation";

export interface ThingtalkDialogParams {
  callback: (config: Partial<AutomationConfig> | undefined) => void;
  input?: string;
}

export const loadThingtalkDialog = () => import("./dialog-thingtalk");

export const showThingtalkDialog = (
  element: HTMLElement,
  dialogParams: ThingtalkDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-thinktalk",
    dialogImport: loadThingtalkDialog,
    dialogParams,
  });
};
