import { fireEvent } from "../../../common/dom/fire_event";
import { EntityRegistryEntry } from "../../../data/entity_registry";

export interface EntityRegistryDetailDialogParams {
  entry: EntityRegistryEntry;
}

export const loadEntityRegistryDetailDialog = () =>
  import(
    /* webpackChunkName: "entity-registry-detail-dialog" */ "./dialog-entity-registry-detail"
  );

export const showEntityRegistryDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: EntityRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-entity-registry-detail",
    dialogImport: loadEntityRegistryDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
