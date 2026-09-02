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
import { getConfigEntries } from "../../../data/config_entries";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { RepositoryBase } from "../data/repository";
import {
  repositoriesClearNewRepository,
  repositoryUninstall,
  repositoryUpdate,
} from "../data/websocket";
import type { HaStoreDashboard } from "../dashboards/ha-store-dashboard";
import type { HaStoreRepositoryDashboard } from "../dashboards/ha-store-repository-dashboard";
import {
  showStoreDownloadDialog,
  showStoreFormDialog,
} from "../dialogs/show-dialog-store";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { generateFrontendResourceURL } from "../tools/frontend-resource";

const showError = (
  element: HaStoreRepositoryDashboard | HaStoreDashboard,
  localize: LocalizeFunc,
  err: { message?: string }
) =>
  showAlertDialog(element, {
    title: localize("ui.panel.store.dialog.error.title"),
    text: err?.message || localize("ui.panel.store.common.unknown_error"),
  });

export const repositoryMenuItems = (
  element: HaStoreRepositoryDashboard | HaStoreDashboard,
  repository: RepositoryBase,
  localize: LocalizeFunc
) => [
  ...(element.nodeName === "HA-STORE-DASHBOARD"
    ? [
        {
          path: mdiInformation,
          label: localize("ui.panel.store.common.show"),
          action: () => navigate(`/store/repository/${repository.id}`),
        },
      ]
    : []),
  {
    path: mdiGithub,
    label: localize("ui.panel.store.common.repository"),
    action: () =>
      window.open(
        `https://github.com/${repository.full_name}`,
        "_blank",
        "noreferrer=true"
      ),
  },
  {
    path: mdiArrowDownCircle,
    label: localize("ui.panel.store.repository_card.update_information"),
    action: async () => {
      try {
        await repositoryUpdate(element.hass, String(repository.id));
      } catch (err: any) {
        showError(element, localize, err);
      }
    },
  },
  {
    path: repository.installed_version ? mdiReload : mdiDownload,
    label: localize(
      repository.installed_version
        ? "ui.panel.store.repository_card.redownload"
        : "ui.panel.store.common.download"
    ),
    action: () =>
      showStoreDownloadDialog(element, {
        store: element.store,
        repositoryId: repository.id,
      }),
  },
  ...(repository.new
    ? [
        {
          path: mdiMoonNew,
          label: localize("ui.panel.store.repository_card.dismiss_new"),
          action: async () => {
            try {
              await repositoriesClearNewRepository(element.hass, repository.id);
            } catch (err: any) {
              showError(element, localize, err);
            }
          },
        },
      ]
    : []),
  ...(repository.category === "plugin" && repository.installed_version
    ? [
        {
          path: mdiLanguageJavascript,
          label: localize("ui.panel.store.repository_card.open_source"),
          action: () =>
            window.open(
              `${generateFrontendResourceURL({ repository })}?cachebuster=${Date.now()}`,
              "_blank",
              "noreferrer=true"
            ),
        },
      ]
    : []),
  { divider: true },
  {
    path: mdiAlertCircleOutline,
    label: localize("ui.panel.store.repository_card.open_issue"),
    action: () =>
      window.open(
        `https://github.com/${repository.full_name}/issues`,
        "_blank",
        "noreferrer=true"
      ),
  },
  ...(repository.installed_version
    ? [
        {
          path: mdiClose,
          label: localize("ui.panel.store.common.remove"),
          action: async () => {
            if (
              repository.category === "integration" &&
              repository.config_flow
            ) {
              const configFlows = (await getConfigEntries(element.hass)).some(
                (entry) => entry.domain === repository.domain
              );
              if (configFlows) {
                const navigateToIntegrations = await showConfirmationDialog(
                  element,
                  {
                    title: localize("ui.panel.store.dialog.configured.title"),
                    text: localize("ui.panel.store.dialog.configured.message", {
                      name: repository.name,
                    }),
                    dismissText: localize("ui.panel.store.common.ignore"),
                    confirmText: localize("ui.panel.store.common.navigate"),
                    confirm: () => {
                      navigate("/config/integrations", { replace: true });
                    },
                  }
                );
                if (navigateToIntegrations) {
                  return;
                }
              }
            }
            showStoreFormDialog(element, {
              store: element.store,
              title: localize("ui.panel.store.dialog.remove.title"),
              saveLabel: localize("ui.panel.store.dialog.remove.title"),
              description: localize("ui.panel.store.dialog.remove.message", {
                name: repository.name,
              }),
              saveAction: async () => {
                await _repositoryRemove(element, repository);
              },
              destructive: true,
            });
          },
          error: true,
        },
      ]
    : []),
];

const _repositoryRemove = async (
  element: HaStoreRepositoryDashboard | HaStoreDashboard,
  repository: RepositoryBase
) => {
  await repositoryUninstall(element.hass, String(repository.id));
  if (element.nodeName === "HA-STORE-REPOSITORY-DASHBOARD") {
    navigate("/store", { replace: true });
  }
};
