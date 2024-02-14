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
