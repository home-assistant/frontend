import { fireEvent } from "../../../../common/dom/fire_event";
import type { BlueprintConfig } from "../../../../data/blueprint";

export const loadBlueprintRenameDialog = () =>
  import("./dialog-blueprint-rename");

export interface RenameDialogParams {
  onClose: () => void;
  path: string;
  config: BlueprintConfig;
  updateConfig: (config: BlueprintConfig) => void;
  updatePath: (path: string) => void;
}

export const showBlueprintRenameDialog = (
  element: HTMLElement,
  dialogParams: RenameDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-blueprint-rename",
    dialogImport: loadBlueprintRenameDialog,
    dialogParams,
  });
};
