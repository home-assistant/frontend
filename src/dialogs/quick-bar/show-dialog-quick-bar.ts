import { fireEvent } from "../../common/dom/fire_event";

export type QuickBarSection =
  | "entity"
  | "device"
  | "area"
  | "navigate"
  | "command";

export interface QuickBarParams {
  entityFilter?: string;
  mode?: QuickBarSection;
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
