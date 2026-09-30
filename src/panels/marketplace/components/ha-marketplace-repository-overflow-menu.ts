import {
  mdiAlertCircleOutline,
  mdiArrowDownCircle,
  mdiDelete,
  mdiDownload,
  mdiGithub,
  mdiHistory,
  mdiInformationOutline,
  mdiLanguageJavascript,
  mdiMoonNew,
  mdiReload,
} from "@mdi/js";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { RepositoryBase } from "../../../data/marketplace/repository";
import { websocketErrorMessage } from "../../../data/marketplace/websocket";
import {
  dismissNewMarketplaceRepository,
  refreshMarketplaceRepository,
  uninstallMarketplaceRepository,
} from "../../../data/marketplace/repository";
import type { HaMarketplaceDashboard } from "../dashboards/ha-marketplace-dashboard";
import type { HaMarketplaceRepositoryDashboard } from "../dashboards/ha-marketplace-repository-dashboard";
import { showMarketplaceInUseDialog } from "../dialogs/show-dialog-marketplace-in-use";
import { showMarketplaceInstallDialog } from "../dialogs/show-dialog-marketplace-install";
import { handleGitHubRateLimited } from "../tools/connect-github";
import { generateFrontendResourceURL } from "../tools/frontend-resource";

export interface MarketplaceRepositoryMenuItem {
  value: string;
  path: string;
  label: string;
  action: () => void;
  variant?: "danger";
}

export type MarketplaceRepositoryMenuEntry =
  MarketplaceRepositoryMenuItem | { divider: true };

type MarketplaceDashboardElement =
  HaMarketplaceRepositoryDashboard | HaMarketplaceDashboard;

const showError = (
  element: MarketplaceDashboardElement,
  localize: LocalizeFunc,
  err: unknown
) =>
  showAlertDialog(element, {
    title: localize("ui.panel.marketplace.dialog.error.title"),
    text:
      websocketErrorMessage(err) ||
      localize("ui.panel.marketplace.common.unknown_error"),
  });

const uninstallRepository = async (
  element: MarketplaceDashboardElement,
  repository: RepositoryBase
) => {
  await uninstallMarketplaceRepository(element.hass, String(repository.id));
  if (element.nodeName === "HA-MARKETPLACE-REPOSITORY-DASHBOARD") {
    navigate("/marketplace", { replace: true });
  }
};

const confirmUninstallRepository = async (
  element: MarketplaceDashboardElement,
  repository: RepositoryBase,
  localize: LocalizeFunc
) => {
  // Its files are what the entries run, core refuses to uninstall it
  if (repository.category === "integration" && repository.domain) {
    let entries: ConfigEntry[];
    try {
      entries = await getConfigEntries(element.hass, {
        domain: repository.domain,
      });
    } catch (err: unknown) {
      showError(element, localize, err);
      return;
    }

    if (entries.length) {
      showMarketplaceInUseDialog(element, {
        repository,
        entries,
        deleteAndUninstall: async () => {
          try {
            for (const entry of entries) {
              // eslint-disable-next-line no-await-in-loop
              await deleteConfigEntry(element.hass, entry.entry_id);
            }
            await uninstallRepository(element, repository);
          } catch (err: unknown) {
            showError(element, localize, err);
            throw err;
          }
        },
      });
      return;
    }
  }

  showConfirmationDialog(element, {
    title: localize("ui.panel.marketplace.dialog.uninstall.title", {
      name: repository.name,
    }),
    text: localize("ui.panel.marketplace.dialog.uninstall.message"),
    confirmText: localize("ui.panel.marketplace.common.uninstall"),
    destructive: true,
    action: async () => {
      try {
        await uninstallRepository(element, repository);
      } catch (err: unknown) {
        // Like removing an app repository, the dialog stays open to try again
        showError(element, localize, err);
        throw err;
      }
    },
  });
};

export const repositoryMenuItems = (
  element: MarketplaceDashboardElement,
  repository: RepositoryBase,
  localize: LocalizeFunc
): MarketplaceRepositoryMenuEntry[] => {
  const entries: MarketplaceRepositoryMenuEntry[] = [];

  if (element.nodeName === "HA-MARKETPLACE-DASHBOARD") {
    entries.push({
      value: "show",
      path: mdiInformationOutline,
      label: localize("ui.panel.marketplace.common.show"),
      action: () => navigate(`/marketplace/repository/${repository.id}`),
    });
  }

  entries.push(
    {
      value: "repository",
      path: mdiGithub,
      label: localize("ui.panel.marketplace.common.repository"),
      action: () =>
        window.open(
          `https://github.com/${repository.full_name}`,
          "_blank",
          "noreferrer=true"
        ),
    },
    {
      value: "update_information",
      path: mdiArrowDownCircle,
      label: localize(
        "ui.panel.marketplace.repository_menu.update_information"
      ),
      action: async () => {
        try {
          await refreshMarketplaceRepository(
            element.hass,
            String(repository.id)
          );
        } catch (err: unknown) {
          if (!handleGitHubRateLimited(element, element.hass, localize, err)) {
            showError(element, localize, err);
          }
        }
      },
    }
  );

  // Always offered, the dialog refuses only a version Home Assistant is too old for.
  entries.push({
    value: "install",
    path: repository.installed_version ? mdiReload : mdiDownload,
    label: localize(
      repository.installed_version
        ? "ui.panel.marketplace.repository_menu.reinstall"
        : "ui.panel.marketplace.common.install"
    ),
    action: () =>
      showMarketplaceInstallDialog(element, {
        marketplace: element.marketplace,
        repositoryId: String(repository.id),
        reinstall: Boolean(repository.installed_version),
      }),
  });

  entries.push({
    value: "install_other_version",
    path: mdiHistory,
    label: localize(
      "ui.panel.marketplace.repository_menu.install_other_version"
    ),
    action: () =>
      showMarketplaceInstallDialog(element, {
        marketplace: element.marketplace,
        repositoryId: String(repository.id),
        chooseVersion: true,
      }),
  });

  if (repository.new) {
    entries.push({
      value: "dismiss_new",
      path: mdiMoonNew,
      label: localize("ui.panel.marketplace.repository_menu.dismiss_new"),
      action: async () => {
        try {
          await dismissNewMarketplaceRepository(
            element.hass,
            String(repository.id)
          );
        } catch (err: unknown) {
          showError(element, localize, err);
        }
      },
    });
  }

  if (repository.category === "plugin" && repository.installed_version) {
    entries.push({
      value: "open_source",
      path: mdiLanguageJavascript,
      label: localize("ui.panel.marketplace.repository_menu.open_source"),
      action: () =>
        window.open(
          `${generateFrontendResourceURL({ repository })}?v=${Date.now()}`,
          "_blank",
          "noreferrer=true"
        ),
    });
  }

  entries.push(
    { divider: true },
    {
      value: "open_issue",
      path: mdiAlertCircleOutline,
      label: localize("ui.panel.marketplace.repository_menu.open_issue"),
      action: () =>
        window.open(
          `https://github.com/${repository.full_name}/issues`,
          "_blank",
          "noreferrer=true"
        ),
    }
  );

  if (repository.installed_version) {
    entries.push({
      value: "uninstall",
      path: mdiDelete,
      label: localize("ui.panel.marketplace.common.uninstall"),
      action: () => confirmUninstallRepository(element, repository, localize),
      variant: "danger",
    });
  }

  return entries;
};
