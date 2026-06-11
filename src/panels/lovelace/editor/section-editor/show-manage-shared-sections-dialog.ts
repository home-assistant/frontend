import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { Lovelace } from "../../types";

export interface ManageSharedSectionsDialogParams {
  lovelace: Lovelace;
  lovelaceConfig: LovelaceConfig;
  saveConfig: (config: LovelaceConfig) => void;
}

const importManageSharedSectionsDialog = () =>
  import("./hui-dialog-manage-shared-sections");

export const showManageSharedSectionsDialog = (
  element: HTMLElement,
  params: ManageSharedSectionsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-manage-shared-sections",
    dialogImport: importManageSharedSectionsDialog,
    dialogParams: params,
  });
};
