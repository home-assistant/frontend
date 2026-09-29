import {
  mdiAlertCircleOutline,
  mdiArrowDownCircle,
  mdiClose,
  mdiDownload,
  mdiGithub,
  mdiInformation,
  mdiLanguageJavascript,
  mdiMoonNew,
  mdiReload,
} from "@mdi/js";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { getConfigEntries } from "../../../data/config_entries";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { RepositoryBase } from "../../../data/marketplace/repository";
import {
  repositoriesClearNewRepository,
  repositoryUninstall,
  repositoryUpdate,
  websocketErrorMessage,
} from "../../../data/marketplace/websocket";
import type { HaMarketplaceDashboard } from "../dashboards/ha-marketplace-dashboard";
import type { HaMarketplaceRepositoryDashboard } from "../dashboards/ha-marketplace-repository-dashboard";
import {
  showMarketplaceDownloadDialog,
  showMarketplaceFormDialog,
} from "../dialogs/show-dialog-marketplace";
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

const removeRepository = async (
  element: MarketplaceDashboardElement,
  repository: RepositoryBase
) => {
  await repositoryUninstall(element.hass, String(repository.id));
  if (element.nodeName === "HA-MARKETPLACE-REPOSITORY-DASHBOARD") {
    navigate("/marketplace", { replace: true });
  }
};

const confirmRemoveRepository = async (
  element: MarketplaceDashboardElement,
  repository: RepositoryBase,
  localize: LocalizeFunc
) => {
  if (repository.category === "integration" && repository.config_flow) {
    const configured = (await getConfigEntries(element.hass)).some(
      (entry) => entry.domain === repository.domain
    );

    if (configured) {
      const navigateToIntegrations = await showConfirmationDialog(element, {
        title: localize("ui.panel.marketplace.dialog.configured.title"),
        text: localize("ui.panel.marketplace.dialog.configured.message", {
          name: repository.name,
        }),
        dismissText: localize("ui.panel.marketplace.common.ignore"),
        confirmText: localize(
          "ui.panel.marketplace.dialog.configured.open_integrations"
        ),
        confirm: () => {
          navigate("/config/integrations", { replace: true });
        },
      });

      if (navigateToIntegrations) {
        return;
      }
    }
  }

  showMarketplaceFormDialog(element, {
    marketplace: element.marketplace,
    title: localize("ui.panel.marketplace.dialog.remove.title", {
      name: repository.name,
    }),
    saveLabel: localize("ui.panel.marketplace.common.remove"),
    description: localize("ui.panel.marketplace.dialog.remove.message"),
    saveAction: async () => {
      await removeRepository(element, repository);
    },
    destructive: true,
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
      path: mdiInformation,
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
        "ui.panel.marketplace.repository_card.update_information"
      ),
      action: async () => {
        try {
          await repositoryUpdate(element.hass, String(repository.id));
        } catch (err: unknown) {
          if (!handleGitHubRateLimited(element, element.hass, err)) {
            showError(element, localize, err);
          }
        }
      },
    }
  );

  // Always offered, the dialog refuses only a version Home Assistant is too old for.
  entries.push({
    value: "download",
    path: repository.installed_version ? mdiReload : mdiDownload,
    label: localize(
      repository.installed_version
        ? "ui.panel.marketplace.repository_card.redownload"
        : "ui.panel.marketplace.common.download"
    ),
    action: () =>
      showMarketplaceDownloadDialog(element, {
        marketplace: element.marketplace,
        repositoryId: String(repository.id),
      }),
  });

  if (repository.new) {
    entries.push({
      value: "dismiss_new",
      path: mdiMoonNew,
      label: localize("ui.panel.marketplace.repository_card.dismiss_new"),
      action: async () => {
        try {
          await repositoriesClearNewRepository(
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
      label: localize("ui.panel.marketplace.repository_card.open_source"),
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
      label: localize("ui.panel.marketplace.repository_card.open_issue"),
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
      value: "remove",
      path: mdiClose,
      label: localize("ui.panel.marketplace.common.remove"),
      action: () => confirmRemoveRepository(element, repository, localize),
      variant: "danger",
    });
  }

  return entries;
};
