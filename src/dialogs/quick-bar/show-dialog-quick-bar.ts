import { fireEvent } from "../../common/dom/fire_event";
import type { ItemType } from "../../data/search";
import { closeDialog } from "../make-dialog-manager";

export type QuickBarSection =
  | "entity"
  | "device"
  | "area"
  | "navigate"
  | "command";

export interface QuickBarParams {
  entityFilter?: string;
  mode?: QuickBarSection;
  showHint?: boolean;
  contextItem?: { itemType: ItemType; itemId: string };
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

export const closeQuickBar = (): void => {
  closeDialog("ha-quick-bar");
};
