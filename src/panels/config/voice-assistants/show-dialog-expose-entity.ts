import { fireEvent } from "../../../common/dom/fire_event";
import { ExtEntityRegistryEntry } from "../../../data/entity_registry";

export interface ExposeEntityDialogParams {
  filterAssistants: string[];
  extendedEntities: Record<string, ExtEntityRegistryEntry>;
  exposeEntities: (entities: string[]) => void;
}

export const loadExposeEntityDialog = () => import("./dialog-expose-entity");

export const showExposeEntityDialog = (
  element: HTMLElement,
  dialogParams: ExposeEntityDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-expose-entity",
    dialogImport: loadExposeEntityDialog,
    dialogParams,
  });
};
