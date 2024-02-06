import { fireEvent } from "../../../common/dom/fire_event";
import { IntegrationManifest } from "../../../data/integration";
import { IntegrationListItem } from "./dialog-add-integration";

export interface AddIntegrationDialogParams {
  brand?: string;
  domain?: string;
  initialFilter?: string;
}

export interface YamlIntegrationDialogParams {
  manifest: IntegrationManifest;
}

export interface SingleInstanceOnlyDialogParams {
  integration: IntegrationListItem;
}

export const showAddIntegrationDialog = (
  element: HTMLElement,
  dialogParams?: AddIntegrationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-add-integration",
    dialogImport: () => import("./dialog-add-integration"),
    dialogParams: dialogParams,
  });
};

export const showYamlIntegrationDialog = (
  element: HTMLElement,
  dialogParams?: YamlIntegrationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-yaml-integration",
    dialogImport: () => import("./dialog-yaml-integration"),
    dialogParams: dialogParams,
  });
};

export const showSingleInstanceOnlyDialog = (
  element: HTMLElement,
  dialogParams?: SingleInstanceOnlyDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-single-instance-only",
    dialogImport: () => import("./dialog-single-instance-only"),
    dialogParams: dialogParams,
  });
};
