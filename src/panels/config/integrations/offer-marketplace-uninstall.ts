import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { getConfigEntries } from "../../../data/config_entries";
import type { RepositoryBase } from "../../../data/marketplace/repository";
import {
  fetchMarketplaceRepositories,
  uninstallMarketplaceRepository,
} from "../../../data/marketplace/repository";
import { websocketErrorMessage } from "../../../data/marketplace/websocket";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";

const installedFromTheMarketplace = async (
  hass: HomeAssistant,
  domain: string
): Promise<RepositoryBase | undefined> => {
  // Another entry still uses its files
  if ((await getConfigEntries(hass, { domain })).length) {
    return undefined;
  }

  return (await fetchMarketplaceRepositories(hass)).find(
    (repository) =>
      repository.installed &&
      repository.category === "integration" &&
      repository.domain === domain
  );
};

// With the last entry of an integration from the Marketplace deleted, its
// files are all that is left of it. Returns whether it was uninstalled.
export const offerMarketplaceUninstall = async (
  element: HTMLElement,
  hass: HomeAssistant,
  domain: string
): Promise<boolean> => {
  if (!isComponentLoaded(hass.config, "marketplace")) {
    return false;
  }

  let repository: RepositoryBase | undefined;
  try {
    repository = await installedFromTheMarketplace(hass, domain);
  } catch (_err: unknown) {
    // Only an offer, the entry itself is deleted already
    return false;
  }
  if (!repository) {
    return false;
  }

  // The row of the deleted entry is likely gone by now, the app can still
  // show the dialog
  const host =
    (element.isConnected
      ? element
      : document.querySelector("home-assistant")) ?? element;
  const { name, id } = repository;
  const confirmed = await showConfirmationDialog(host, {
    title: hass.localize(
      "ui.panel.config.integrations.config_entry.marketplace_uninstall.title",
      { name }
    ),
    text: hass.localize(
      "ui.panel.config.integrations.config_entry.marketplace_uninstall.text",
      { name }
    ),
    confirmText: hass.localize(
      "ui.panel.config.integrations.config_entry.marketplace_uninstall.confirm"
    ),
    dismissText: hass.localize(
      "ui.panel.config.integrations.config_entry.marketplace_uninstall.dismiss"
    ),
    destructive: true,
  });
  if (!confirmed) {
    return false;
  }

  // After the question, the alert takes the place of the same dialog
  try {
    await uninstallMarketplaceRepository(hass, id);
  } catch (err: unknown) {
    // Outside the Marketplace panel, nothing loaded its error translations yet
    const localize = await hass.loadBackendTranslation(
      "exceptions",
      "marketplace"
    );
    showAlertDialog(host, {
      text:
        websocketErrorMessage(err, localize) ||
        hass.localize(
          "ui.panel.config.integrations.config_entry.marketplace_uninstall.failed"
        ),
    });
    return false;
  }
  return true;
};
