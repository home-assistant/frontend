import { fireEvent } from "../../../common/dom/fire_event";
import { ExposeEntitySettings } from "../../../data/expose";

export interface ExposeEntityDialogParams {
  filterAssistants: string[];
  exposedEntities: Record<string, ExposeEntitySettings>;
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
