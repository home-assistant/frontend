import type { HTMLTemplateResult } from "lit";
import { fireEvent } from "../../../common/dom/fire_event";
import type {
  HaFormDataContainer,
  HaFormSchema,
} from "../../../components/ha-form/types";
import type { MarketplaceData } from "../data/marketplace";
import type { RepositoryInfo } from "../data/repository";

interface BaseMarketplaceDialogParams {
  marketplace: MarketplaceData;
}

export interface MarketplaceFormDialogParams extends BaseMarketplaceDialogParams {
  title: string;
  schema?: readonly HaFormSchema[];
  data?: HaFormDataContainer;
  saveLabel?: string;
  destructive?: boolean;
  description?: HTMLTemplateResult | string;
  computeLabelCallback?: (
    schema: HaFormSchema,
    data: HaFormDataContainer
  ) => string;
  computeHelper?: (schema: HaFormSchema) => string | undefined;
  computeError?: (
    error: string,
    schema: HaFormSchema | readonly HaFormSchema[]
  ) => string;
  saveAction?: (data?: HaFormDataContainer) => Promise<void>;
}

export interface MarketplaceDownloadDialogParams extends BaseMarketplaceDialogParams {
  repositoryId: string;
  repository?: RepositoryInfo;
}

export type MarketplaceCustomRepositoriesDialogParams =
  BaseMarketplaceDialogParams;

export const showMarketplaceFormDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceFormDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-form",
    dialogImport: () => import("./dialog-marketplace-form"),
    dialogParams,
  });
};

export const showMarketplaceDownloadDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceDownloadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-download",
    dialogImport: () => import("./dialog-marketplace-download"),
    dialogParams,
  });
};

export const showMarketplaceCustomRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceCustomRepositoriesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-custom-repositories",
    dialogImport: () => import("./dialog-marketplace-custom-repositories"),
    dialogParams,
  });
};
