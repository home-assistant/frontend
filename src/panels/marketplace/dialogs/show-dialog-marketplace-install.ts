import { fireEvent } from "../../../common/dom/fire_event";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../data/marketplace/repository";

export interface MarketplaceInstallDialogParams {
  marketplace: MarketplaceData;
  repositoryId: string;
  repository?: RepositoryInfo;
  // Opens with the versions to choose from, instead of the newest one
  chooseVersion?: boolean;
  // Installs the installed version again, instead of the newest one
  reinstall?: boolean;
}

const loadMarketplaceInstallDialog = () =>
  import("./dialog-marketplace-install");

export const showMarketplaceInstallDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceInstallDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-install",
    dialogImport: loadMarketplaceInstallDialog,
    dialogParams,
  });
};
