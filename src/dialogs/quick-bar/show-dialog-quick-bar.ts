import { fireEvent } from "../../common/dom/fire_event";

export interface QuickBarParams {
  entityFilter?: string;
  commandMode?: boolean;
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
