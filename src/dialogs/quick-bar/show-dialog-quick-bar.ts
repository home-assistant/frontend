import { fireEvent } from "../../common/dom/fire_event";
import type { ItemType, RelatedResult } from "../../data/search";
import type { HomeAssistant } from "../../types";
import { closeDialog } from "../make-dialog-manager";

export type QuickBarSection =
  | "entity"
  | "device"
  | "area"
  | "navigate"
  | "command";

export interface QuickBarContextItem {
  itemType: ItemType;
  itemId: string;
}

export interface QuickBarParams {
  entityFilter?: string;
  mode?: QuickBarSection;
  showHint?: boolean;
  contextItem?: QuickBarContextItem;
  related?: RelatedResult;
}

/** Non-admin users cannot scope the bar to command, device, or area (those sections are admin-only). */
export const effectiveQuickBarMode = (
  hass: HomeAssistant,
  mode?: QuickBarSection
): QuickBarSection | undefined => {
  if (mode === undefined) {
    return undefined;
  }
  if (hass.user?.is_admin) {
    return mode;
  }
  if (mode === "command" || mode === "device" || mode === "area") {
    return undefined;
  }
  return mode;
};

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
