import { fireEvent } from "../../../common/dom/fire_event";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";

export interface MarketplaceCustomRepositoriesDialogParams {
  marketplace: MarketplaceData;
}

const loadMarketplaceCustomRepositoriesDialog = () =>
  import("./dialog-marketplace-custom-repositories");

export const showMarketplaceCustomRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceCustomRepositoriesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-custom-repositories",
    dialogImport: loadMarketplaceCustomRepositoriesDialog,
    dialogParams,
  });
};
