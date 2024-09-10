import { fireEvent } from "../../../../common/dom/fire_event";
import {
  EntityRegistryEntry,
  EntityRegistryIcon,
} from "../../../../data/entity_registry";

export interface EntityStateIconDialogParams {
  entry: EntityRegistryEntry;
  icon: string | EntityRegistryIcon;
  updateIcon: (icons: EntityRegistryIcon | null) => Promise<unknown>;
}

export const loadEntityStateIconDialog = () =>
  import("./dialog-entity-state-icon");

export const showEntityStateIconDialog = (
  element: HTMLElement,
  params: EntityStateIconDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-entity-state-icon",
    dialogImport: loadEntityStateIconDialog,
    dialogParams: params,
  });
};
