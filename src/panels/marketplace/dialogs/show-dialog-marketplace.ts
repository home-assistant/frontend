import type { HTMLTemplateResult } from "lit";
import { fireEvent } from "../../../common/dom/fire_event";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../data/marketplace/repository";

interface BaseMarketplaceDialogParams {
  marketplace: MarketplaceData;
}

export interface MarketplaceFormDialogParams extends BaseMarketplaceDialogParams {
  title: string;
  saveLabel?: string;
  destructive?: boolean;
  description?: HTMLTemplateResult | string;
  saveAction?: () => Promise<void>;
}

export interface MarketplaceDownloadDialogParams extends BaseMarketplaceDialogParams {
  repositoryId: string;
  repository?: RepositoryInfo;
  // Opens with the versions to choose from, instead of the newest one
  chooseVersion?: boolean;
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
