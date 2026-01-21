import { fireEvent } from "../../../../common/dom/fire_event";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { SceneConfig } from "../../../../data/scene";

export const loadSceneSaveDialog = () => import("./dialog-scene-save");

interface BaseRenameDialogParams {
  entityRegistryUpdate?: EntityRegistryUpdate;
  entityRegistryEntry?: EntityRegistryEntry;
  onClose?: () => void;
  onDiscard?: () => void;
  saveText?: string;
  description?: string;
  title?: string;
  hideInputs?: boolean;
}

export interface EntityRegistryUpdate {
  area: string;
  labels: string[];
  category: string;
}

export interface SceneSaveDialogParams extends BaseRenameDialogParams {
  config: SceneConfig;
  domain: "scene";
  updateConfig: (
    config: SceneConfig,
    entityRegistryUpdate: EntityRegistryUpdate
  ) => Promise<void>;
}

export const showSceneSaveDialog = (
  element: HTMLElement,
  dialogParams: SceneSaveDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-scene-save",
    dialogImport: loadSceneSaveDialog,
    dialogParams,
  });
};
