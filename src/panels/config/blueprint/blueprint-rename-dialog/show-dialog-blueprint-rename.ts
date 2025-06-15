import { fireEvent } from "../../../../common/dom/fire_event";
import type { Blueprint } from "../../../../data/blueprint";

export const loadBlueprintRenameDialog = () =>
  import("./dialog-blueprint-rename");

export interface RenameDialogParams {
  onClose: () => void;
  path?: string;
  blueprint: Blueprint;
  updateBlueprint: (blueprint: Blueprint) => void;
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
