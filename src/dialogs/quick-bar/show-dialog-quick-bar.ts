import { fireEvent } from "../../common/dom/fire_event";

export const enum QuickBarMode {
  Command = "command",
  Device = "device",
  Entity = "entity",
}

export interface QuickBarParams {
  entityFilter?: string;
  mode?: QuickBarMode;
  hint?: string;
}

export const loadQuickBar = () => import("./ha-quick-bar");

export const showQuickBar = (
  element: HTMLElement,
  dialogParams: QuickBarParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-quick-bar",
    dialogImport: loadQuickBar,
    dialogParams,
    addHistory: false,
  });
};
