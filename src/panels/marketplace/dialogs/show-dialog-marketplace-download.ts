import { fireEvent } from "../../../common/dom/fire_event";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../data/marketplace/repository";

export interface MarketplaceDownloadDialogParams {
  marketplace: MarketplaceData;
  repositoryId: string;
  repository?: RepositoryInfo;
  // Opens with the versions to choose from, instead of the newest one
  chooseVersion?: boolean;
}

export const loadMarketplaceDownloadDialog = () =>
  import("./dialog-marketplace-download");

export const showMarketplaceDownloadDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceDownloadDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-download",
    dialogImport: loadMarketplaceDownloadDialog,
    dialogParams,
  });
};
