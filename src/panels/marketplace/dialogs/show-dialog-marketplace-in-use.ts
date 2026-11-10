import { fireEvent } from "../../../common/dom/fire_event";
import type { ConfigEntry } from "../../../data/config_entries";
import type { RepositoryBase } from "../../../data/marketplace/repository";

export interface MarketplaceInUseDialogParams {
  repository: RepositoryBase;
  entries: ConfigEntry[];
  // Deletes the entries and uninstalls, rejects with what went wrong
  deleteAndUninstall: () => Promise<void>;
}

const loadMarketplaceInUseDialog = () => import("./dialog-marketplace-in-use");

export const showMarketplaceInUseDialog = (
  element: HTMLElement,
  dialogParams: MarketplaceInUseDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-marketplace-in-use",
    dialogImport: loadMarketplaceInUseDialog,
    dialogParams,
  });
};
