import { fireEvent } from "../../common/dom/fire_event";
import { CommandItem } from "./ha-quick-bar";

export interface QuickBarParams {
  entityFilter?: string;
  commandMode?: boolean;
  commandType?: CommandItem["categoryKey"];
}

export const loadQuickBar = () =>
  import(/* webpackChunkName: "quick-bar-dialog" */ "./ha-quick-bar");

export const showQuickBar = (
  element: HTMLElement,
  dialogParams: QuickBarParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-quick-bar",
    dialogImport: loadQuickBar,
    dialogParams,
  });
};
