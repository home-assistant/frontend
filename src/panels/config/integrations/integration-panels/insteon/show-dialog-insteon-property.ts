import { fireEvent } from "../../../../../common/dom/fire_event";
import { Property } from "../../../../../data/insteon";
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";

export interface InsteonPropertyDialogParams {
  record: Property;
  schema: HaFormSchema;
  title: string;
  callback: (name: string, value: any) => Promise<void>;
}

export const loadInsteonPropertyDialog = () =>
  import(
    /* webpackChunkName: "dialog-insteon-property" */ "./dialog-insteon-property"
  );

export const showInsteonPropertyDialog = (
  element: HTMLElement,
  insteonPropertyParams: InsteonPropertyDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-insteon-property",
    dialogImport: loadInsteonPropertyDialog,
    dialogParams: insteonPropertyParams,
  });
};
