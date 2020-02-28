import { fireEvent } from "../../../../common/dom/fire_event";
import {
  LovelaceResource,
  LovelaceResourcesMutableParams,
} from "../../../../data/lovelace";

export interface LovelaceResourceDetailsDialogParams {
  resource?: LovelaceResource;
  createResource: (values: LovelaceResourcesMutableParams) => Promise<unknown>;
  updateResource: (
    updates: Partial<LovelaceResourcesMutableParams>
  ) => Promise<unknown>;
  removeResource: () => Promise<boolean>;
}

export const loadResourceDetailDialog = () =>
  import(
    /* webpackChunkName: "lovelace-resource-detail-dialog" */ "./dialog-lovelace-resource-detail"
  );

export const showResourceDetailDialog = (
  element: HTMLElement,
  dialogParams: LovelaceResourceDetailsDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-lovelace-resource-detail",
    dialogImport: loadResourceDetailDialog,
    dialogParams,
  });
};
