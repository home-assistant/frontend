import { fireEvent } from "../../../common/dom/fire_event";

export const PASTE_VALUE = "__paste__";

export interface AddAutomationElementDialogParams {
  type: "trigger" | "condition" | "action";
  add: (key: string) => void;
  clipboardItem: string | undefined;
  group?: string;
}
const loadDialog = () => import("./add-automation-element-dialog");

export const showAddAutomationElementDialog = (
  element: HTMLElement,
  dialogParams: AddAutomationElementDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "add-automation-element-dialog",
    dialogImport: loadDialog,
    dialogParams,
  });
};
