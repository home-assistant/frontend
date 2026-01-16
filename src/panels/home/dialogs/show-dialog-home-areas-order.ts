import { fireEvent } from "../../../common/dom/fire_event";
import type { HomeFrontendSystemData } from "../../../data/frontend";

export interface HomeAreasOrderDialogParams {
  config: HomeFrontendSystemData;
  saveConfig: (config: HomeFrontendSystemData) => Promise<void>;
}

export const loadHomeAreasOrderDialog = () =>
  import("./dialog-home-areas-order");

export const showHomeAreasOrderDialog = (
  element: HTMLElement,
  params: HomeAreasOrderDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-home-areas-order",
    dialogImport: loadHomeAreasOrderDialog,
    dialogParams: params,
  });
};
