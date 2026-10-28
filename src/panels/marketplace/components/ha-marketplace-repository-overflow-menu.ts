import {
  mdiArrowDownCircle,
  mdiBug,
  mdiDelete,
  mdiDownload,
  mdiGithub,
  mdiHistory,
  mdiInformationOutline,
  mdiMoonNew,
  mdiReload,
} from "@mdi/js";
import { html } from "lit";
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
import { marketplaceErrorMessage } from "../../../data/marketplace/websocket";
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
import type { MarketplaceApi } from "../tools/connect-github";

export interface MarketplaceRepositoryMenuItem {
  value: string;
  path: string;
  label: string;
  action: () => void;
  variant?: "danger";
}

export type MarketplaceRepositoryMenuEntry =
  MarketplaceRepositoryMenuItem | { divider: true };

export const renderRepositoryMenuEntry = (
  entry: MarketplaceRepositoryMenuEntry
) =>
  "divider" in entry
    ? html`<wa-divider></wa-divider>`
    : html`
        <ha-dropdown-item
          .value=${entry.value}
          variant=${entry.variant || "default"}
        >
          <ha-svg-icon .path=${entry.path} slot="icon"></ha-svg-icon>
          ${entry.label}
        </ha-dropdown-item>
      `;

type MarketplaceDashboardElement =
  HaMarketplaceRepositoryDashboard | HaMarketplaceDashboard;

const showError = (
  element: MarketplaceDashboardElement,
  localize: LocalizeFunc,
  err: unknown
) =>
  showAlertDialog(element, {
    title: localize("ui.panel.marketplace.dialog.error.title"),
    text: marketplaceErrorMessage(err, localize),
  });

const uninstallRepository = async (
  element: MarketplaceDashboardElement,
  api: MarketplaceApi,
  repository: RepositoryBase
) => {
  await uninstallMarketplaceRepository(api, repository.id);
  if (element.nodeName === "HA-MARKETPLACE-REPOSITORY-DASHBOARD") {
    navigate("/marketplace", { replace: true });
  }
};

const confirmUninstallRepository = async (
  element: MarketplaceDashboardElement,
  api: MarketplaceApi,
  repository: RepositoryBase,
  localize: LocalizeFunc
) => {
  // Its files are what the entries run, core refuses to uninstall it
  if (repository.category === "integration" && repository.domain) {
    let entries: ConfigEntry[];
    try {
      entries = await getConfigEntries(api, {
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
              await deleteConfigEntry(api, entry.entry_id);
            }

            await uninstallRepository(element, api, repository);
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
        await uninstallRepository(element, api, repository);
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
  api: MarketplaceApi,
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
          await refreshMarketplaceRepository(api, repository.id);
        } catch (err: unknown) {
          if (!handleGitHubRateLimited(element, api, localize, err)) {
            showError(element, localize, err);
          }
          return;
        }

        // The list leaves out what only the page shows, like the open issues
        if (element.nodeName === "HA-MARKETPLACE-REPOSITORY-DASHBOARD") {
          (element as HaMarketplaceRepositoryDashboard).reloadRepository();
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
        repositoryId: repository.id,
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
        repositoryId: repository.id,
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
          await dismissNewMarketplaceRepository(api, repository.id);
        } catch (err: unknown) {
          showError(element, localize, err);
        }
      },
    });
  }

  entries.push(
    { divider: true },
    {
      value: "issue_tracker",
      path: mdiBug,
      label: localize("ui.panel.marketplace.repository_menu.issue_tracker"),
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
      action: () =>
        confirmUninstallRepository(element, api, repository, localize),
      variant: "danger",
    });
  }

  return entries;
};
