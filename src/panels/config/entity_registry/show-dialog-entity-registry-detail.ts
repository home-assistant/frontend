import { fireEvent } from "../../../common/dom/fire_event";
import {
  EntityRegistryEntry,
  EntityRegistryEntryUpdateParams,
} from "../../../data/entity_registry";

const dialogTag = "dialog-entity-registry-detail";

export interface EntityRegistryDetailDialogParams {
  entry: EntityRegistryEntry;
  updateEntry: (
    updates: Partial<EntityRegistryEntryUpdateParams>
  ) => Promise<unknown>;
  removeEntry: () => Promise<boolean>;
}

export const loadEntityRegistryDetailDialog = () =>
  import(/* webpackChunkName: "entity-registry-detail-dialog" */ "./dialog-entity-registry-detail");

export const showEntityRegistryDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: EntityRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag,
    dialogImport: loadEntityRegistryDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
