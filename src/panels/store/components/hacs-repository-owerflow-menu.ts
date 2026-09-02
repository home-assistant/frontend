import {
  mdiAlert,
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
import memoizeOne from "memoize-one";
import { mainWindow } from "../../homeassistant-frontend/src/common/dom/get_main_window";
import { navigate } from "../../homeassistant-frontend/src/common/navigate";
import { getConfigEntries } from "../../homeassistant-frontend/src/data/config_entries";
import { showConfirmationDialog } from "../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import type { RepositoryBase } from "../data/repository";
import {
  repositoriesClearNewRepository,
  repositoryUninstall,
  repositoryUpdate,
} from "../data/websocket";
import type { HacsDashboard } from "../dashboards/hacs-dashboard";
import type { HacsRepositoryDashboard } from "../dashboards/hacs-repository-dashboard";
import { showHacsDownloadDialog, showHacsFormDialog } from "./dialogs/show-hacs-dialog";
import { LocalizeFunc } from "../../homeassistant-frontend/src/common/translations/localize";
import { HacsLocalizeKeys } from "../data/localize";

export const repositoryMenuItems = memoizeOne(
  (
    element: HacsRepositoryDashboard | HacsDashboard,
    repository: RepositoryBase,
    localize: LocalizeFunc<HacsLocalizeKeys>,
  ) => [
    ...(element.nodeName === "HACS-DASHBOARD"
      ? [
          {
            path: mdiInformation,
            label: localize("common.show"),
            action: () => navigate(`/hacs/repository/${repository.id}`),
          },
        ]
      : []),
    {
      path: mdiGithub,
      label: localize("common.repository"),
      action: () =>
        mainWindow.open(`https://github.com/${repository.full_name}`, "_blank", "noreferrer=true"),
    },
    {
      path: mdiArrowDownCircle,
      label: localize("repository_card.update_information"),
      action: async () => {
        await repositoryUpdate(element.hass, String(repository.id));
      },
    },
    {
      path: repository.installed_version ? mdiReload : mdiDownload,
      label: localize(
        repository.installed_version ? "repository_card.redownload" : "common.download",
      ),
      action: () =>
        showHacsDownloadDialog(element, { hacs: element.hacs, repositoryId: repository.id }),
      hideForUninstalled: true,
    },
    ...(repository.new
      ? [
          {
            path: mdiMoonNew,
            label: localize("repository_card.dismiss_new"),
            action: () => repositoriesClearNewRepository(element.hass, repository.id),
          },
        ]
      : []),
    ...(repository.category === "plugin" && repository.installed_version
      ? [
          {
            path: mdiLanguageJavascript,
            label: localize("repository_card.open_source"),
            action: () =>
              mainWindow.open(
                `/hacsfiles/${repository.local_path.split("/").pop()}/${repository.file_name}?cachebuster=${Date.now()}`,
                "_blank",
                "noreferrer=true",
              ),
          },
        ]
      : []),
    { divider: true },
    {
      path: mdiAlertCircleOutline,
      label: localize("repository_card.open_issue"),
      action: () =>
        mainWindow.open(
          `https://github.com/${repository.full_name}/issues`,
          "_blank",
          "noreferrer=true",
        ),
    },
    ...(repository.id !== "172733314" && repository.installed_version
      ? [
          {
            path: mdiAlert,
            label: localize("repository_card.report"),
            action: () =>
              mainWindow.open(
                `https://github.com/hacs/integration/issues/new?assignees=ludeeus&labels=flag&template=removal.yml&repo=${repository.full_name}&title=Request for removal of ${repository.full_name}`,
                "_blank",
                "noreferrer=true",
              ),
            warning: true,
          },
          {
            path: mdiClose,
            label: localize("common.remove"),
            action: async () => {
              if (repository.category === "integration" && repository.config_flow) {
                const configFlows = (await getConfigEntries(element.hass)).some(
                  (entry) => entry.domain === repository.domain,
                );
                if (configFlows) {
                  const ignore = await showConfirmationDialog(element, {
                    title: localize("dialog.configured.title"),
                    text: localize("dialog.configured.message", {
                      name: repository.name,
                    }),
                    dismissText: localize("common.ignore"),
                    confirmText: localize("common.navigate"),
                    confirm: () => {
                      navigate("/config/integrations", { replace: true });
                    },
                  });
                  if (ignore) {
                    return;
                  }
                }
              }
              showHacsFormDialog(element, {
                hacs: element.hacs,
                title: localize("dialog.remove.title"),
                saveLabel: localize("dialog.remove.title"),
                description: localize("dialog.remove.message", {
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
  ],
);

const _repositoryRemove = async (
  element: HacsRepositoryDashboard | HacsDashboard,
  repository: RepositoryBase,
) => {
  await repositoryUninstall(element.hass, String(repository.id));
  if (element.nodeName === "HACS-REPOSITORY-PANEL") {
    history.back();
  }
};
