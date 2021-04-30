import { fireEvent } from "../../../common/dom/fire_event";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import type { DialogEntityEditor } from "./dialog-entity-editor";

export interface EntityRegistryDetailDialogParams {
  entry?: EntityRegistryEntry;
  entity_id: string;
  tab?: string;
}

export const loadEntityEditorDialog = () => import("./dialog-entity-editor");

const getDialog = () =>
  document
    .querySelector("home-assistant")!
    .shadowRoot!.querySelector("dialog-entity-editor") as
    | DialogEntityEditor
    | undefined;

export const showEntityEditorDialog = (
  element: HTMLElement,
  entityDetailParams: EntityRegistryDetailDialogParams
): (() => DialogEntityEditor | undefined) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-entity-editor",
    dialogImport: loadEntityEditorDialog,
    dialogParams: entityDetailParams,
  });
  return getDialog;
};
