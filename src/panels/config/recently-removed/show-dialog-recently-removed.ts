import type { LitElement } from "lit";
import { fireEvent } from "../../../common/dom/fire_event";

export interface RecentlyRemovedDialogParams {
  type: "device" | "entity";
}

export const showRecentlyRemovedDialog = (
  element: LitElement,
  params: RecentlyRemovedDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-recently-removed",
    dialogParams: params,
    dialogImport: () => import("./dialog-recently-removed"),
  });
