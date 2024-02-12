import { fireEvent } from "../../../common/dom/fire_event";
import { IntegrationManifest } from "../../../data/integration";

export interface AddIntegrationDialogParams {
  brand?: string;
  domain?: string;
  initialFilter?: string;
}

export interface YamlIntegrationDialogParams {
  manifest: IntegrationManifest;
}

export interface SingleConfigEntryOnlyDialogParams {
  name: string;
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

export const showSingleConfigEntryOnlyDialog = (
  element: HTMLElement,
  dialogParams?: SingleConfigEntryOnlyDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-single-config-entry-only",
    dialogImport: () => import("./dialog-single-config-entry-only"),
    dialogParams: dialogParams,
  });
};
