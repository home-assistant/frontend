import type { HTMLTemplateResult } from "lit";
import { fireEvent } from "../../../common/dom/fire_event";
import type {
  HaFormDataContainer,
  HaFormSchema,
} from "../../../components/ha-form/types";
import type { StoreData } from "../data/store";
import type { RepositoryInfo } from "../data/repository";

interface BaseStoreDialogParams {
  store: StoreData;
}

export interface StoreFormDialogParams extends BaseStoreDialogParams {
  title: string;
  schema?: readonly HaFormSchema[];
  data?: HaFormDataContainer;
  saveLabel?: string;
  destructive?: boolean;
  description?: HTMLTemplateResult | string;
  computeLabelCallback?: (schema: any, data: HaFormDataContainer) => string;
  computeHelper?: (schema: any) => string | undefined;
  computeError?: (error, schema: any) => string;
  saveAction?: (data: any) => Promise<void>;
}

export interface StoreDownloadDialogParams extends BaseStoreDialogParams {
  repositoryId: string;
  repository?: RepositoryInfo;
}

export interface StoreCustomRepositoriesDialogParams extends BaseStoreDialogParams {}

export const showStoreFormDialog = (
  element: HTMLElement,
  dialogParams: StoreFormDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-store-form",
    dialogImport: () => import("./dialog-store-form"),
    dialogParams,
  });
};

export const showStoreDownloadDialog = (
  element: HTMLElement,
  dialogParams: StoreDownloadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-store-download",
    dialogImport: () => import("./dialog-store-download"),
    dialogParams,
  });
};

export const showStoreCustomRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: StoreCustomRepositoriesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-store-custom-repositories",
    dialogImport: () => import("./dialog-store-custom-repositories"),
    dialogParams,
  });
};
