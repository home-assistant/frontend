import type { ConfigPath } from "../../../../common/util/config-path";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { Lovelace } from "../../types";

export interface CreateSectionDialogParams {
  lovelace: Lovelace;
  containerPath: ConfigPath;
}

export const showCreateSectionDialog = (
  element: HTMLElement,
  params: CreateSectionDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-create-section",
    dialogImport: () => import("./hui-dialog-create-section"),
    dialogParams: params,
  });
};

export const showSelectSectionStrategyDialog = (
  element: HTMLElement,
  params: CreateSectionDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-section-strategy",
    dialogImport: () => import("./hui-dialog-select-section-strategy"),
    dialogParams: params,
  });
};
