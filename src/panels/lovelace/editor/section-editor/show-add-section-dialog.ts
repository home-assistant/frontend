import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { Lovelace } from "../../types";

export interface AddSectionDialogParams {
  lovelace: Lovelace;
  lovelaceConfig: LovelaceConfig;
  viewIndex: number;
  saveConfig: (config: LovelaceConfig) => void;
}

const importAddSectionDialog = () => import("./hui-dialog-add-section");

export const showAddSectionDialog = (
  element: HTMLElement,
  params: AddSectionDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-add-section",
    dialogImport: importAddSectionDialog,
    dialogParams: params,
  });
};
