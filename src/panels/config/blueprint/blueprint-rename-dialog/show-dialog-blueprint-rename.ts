import { fireEvent } from "../../../../common/dom/fire_event";
import type { BlueprintConfig } from "../../../../data/blueprint";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";

export const loadBlueprintRenameDialog = () =>
  import("./dialog-blueprint-rename");

export interface RenameDialogParams {
  entityRegistryUpdate?: EntityRegistryUpdate;
  entityRegistryEntry?: EntityRegistryEntry;
  onClose: () => void;
  config: BlueprintConfig;
  updateConfig: (
    config: BlueprintConfig,
    entityRegistryUpdate: EntityRegistryUpdate
  ) => void;
}

export interface EntityRegistryUpdate {
  area: string;
  labels: string[];
  category: string;
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
