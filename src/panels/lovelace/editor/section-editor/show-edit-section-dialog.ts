import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceSectionPath } from "../lovelace-path";
import type { Lovelace } from "../../types";

export interface EditSectionDialogParams {
  lovelace: Lovelace;
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
  path: LovelaceSectionPath;
}

const importEditSectionDialog = () => import("./hui-dialog-edit-section");

export const showEditSectionDialog = (
  element: HTMLElement,
  editSectionDialogParams: EditSectionDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-section",
    dialogImport: importEditSectionDialog,
    dialogParams: editSectionDialogParams,
  });
};
