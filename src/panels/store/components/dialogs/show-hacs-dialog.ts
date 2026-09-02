import type { HTMLTemplateResult } from "lit";
import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import type {
  HaFormDataContainer,
  HaFormSchema,
} from "../../../homeassistant-frontend/src/components/ha-form/types";
import type { Hacs } from "../../data/hacs";
import type { RepositoryInfo } from "../../data/repository";

interface BaseHacsDialogParams {
  hacs: Hacs;
}

export interface HacsFormDialogParams extends BaseHacsDialogParams {
  title: string;
  schema?: readonly HaFormSchema[];
  data?: HaFormDataContainer;
  saveLabel?: string;
  destructive?: boolean;
  description?: HTMLTemplateResult | string;
  computeLabelCallback?: (schema: any, data: HaFormDataContainer) => string;
  computeHelper?: (schema: any) => string | undefined;
  computeError?: (schema: any, error) => string;
  saveAction?: (data: any) => Promise<void>;
}

export interface HacsDownloadDialogParams extends BaseHacsDialogParams {
  repositoryId: string;
  repository?: RepositoryInfo;
}

export interface HacsCustomRepositoriesDialogParams extends BaseHacsDialogParams {}

export const showHacsFormDialog = (
  element: HTMLElement,
  dialogParams: HacsFormDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hacs-form-dialog",
    dialogImport: () => import("./hacs-form-dialog"),
    dialogParams,
  });
};

export const showHacsDownloadDialog = (
  element: HTMLElement,
  dialogParams: HacsDownloadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hacs-download-dialog",
    dialogImport: () => import("./hacs-download-dialog"),
    dialogParams,
  });
};

export const showHacsCustomRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: HacsCustomRepositoriesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hacs-custom-repositories-dialog",
    dialogImport: () => import("./hacs-custom-repositories-dialog"),
    dialogParams,
  });
};
