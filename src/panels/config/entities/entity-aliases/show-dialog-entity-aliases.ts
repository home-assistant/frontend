import { fireEvent } from "../../../../common/dom/fire_event";
import {
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
} from "../../../../data/entity_registry";

export interface EntityAliasesDialogParams {
  entity: ExtEntityRegistryEntry;
  updateEntry: (
    updates: Partial<EntityRegistryEntryUpdateParams>
  ) => Promise<unknown>;
}

export const loadEntityAliasesDialog = () => import("./dialog-entity-aliases");

export const showEntityAliasesDialog = (
  element: HTMLElement,
  entityAliasesParams: EntityAliasesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-entity-aliases",
    dialogImport: loadEntityAliasesDialog,
    dialogParams: entityAliasesParams,
  });
};
