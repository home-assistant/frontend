import {
  fetchConfig,
  fetchDashboards,
  LovelaceConfig,
  LovelacePanelConfig,
  saveConfig,
} from "../../../data/lovelace";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { showSuggestCardDialog } from "./card-editor/show-suggest-card-dialog";
import { showSelectViewDialog } from "./select-view/show-select-view-dialog";

export const addEntitiesToLovelaceView = async (
  element: HTMLElement,
  hass: HomeAssistant,
  entities: string[],
  cardTitle?: string
) => {
  hass.loadFragmentTranslation("lovelace");
  const dashboards = await fetchDashboards(hass);

  const storageDashs = dashboards.filter(
    (dashboard) => dashboard.mode === "storage"
  );

  const mainLovelaceMode = (
    hass!.panels.lovelace?.config as LovelacePanelConfig
  )?.mode;

  if (mainLovelaceMode !== "storage" && !storageDashs.length) {
    // no storage dashboards, just show the YAML config
    showSuggestCardDialog(element, {
      entities,
      yaml: true,
      cardTitle,
    });
    return;
  }

  let lovelaceConfig;
  let urlPath: string | null = null;
  if (mainLovelaceMode === "storage") {
    try {
      lovelaceConfig = await fetchConfig(hass.connection, null, false);
    } catch (err: any) {
      // default dashboard is in generated mode
    }
  }

  if (!lovelaceConfig && storageDashs.length) {
    // find first dashoard not in generated mode
    for (const storageDash of storageDashs) {
      try {
        // eslint-disable-next-line no-await-in-loop
        lovelaceConfig = await fetchConfig(
          hass.connection,
          storageDash.url_path,
          false
        );
        urlPath = storageDash.url_path;
        break;
      } catch (err: any) {
        // dashboard is in generated mode
      }
    }
  }

  if (!lovelaceConfig) {
    if (dashboards.length > storageDashs.length) {
      // all storage dashboards are generated, but we have YAML dashboards just show the YAML config
      showSuggestCardDialog(element, {
        entities,
        yaml: true,
        cardTitle,
      });
    } else {
      // all storage dashboards are generated
      showAlertDialog(element, {
        text: "You don't seem to be in control of any dashboard, please take control first.",
      });
    }
    return;
  }

  if (!storageDashs.length && !lovelaceConfig.views?.length) {
    showAlertDialog(element, {
      text: "You don't have any Lovelace views, first create a view in Lovelace.",
    });
    return;
  }

  if (!storageDashs.length && lovelaceConfig.views.length === 1) {
    showSuggestCardDialog(element, {
      cardTitle,
      lovelaceConfig: lovelaceConfig!,
      saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
        try {
          await saveConfig(hass!, null, newConfig);
        } catch (err: any) {
          alert(hass.localize("ui.panel.lovelace.add_entities.saving_failed"));
        }
      },
      path: [0],
      entities,
    });
    return;
  }

  showSelectViewDialog(element, {
    lovelaceConfig,
    urlPath,
    allowDashboardChange: true,
    actionLabel: hass.localize("ui.common.next"),
    dashboards,
    viewSelectedCallback: (newUrlPath, selectedDashConfig, viewIndex) => {
      showSuggestCardDialog(element, {
        cardTitle,
        lovelaceConfig: selectedDashConfig,
        saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
          try {
            await saveConfig(hass!, newUrlPath, newConfig);
          } catch {
            alert(
              hass.localize("ui.panel.lovelace.add_entities.saving_failed")
            );
          }
        },
        path: [viewIndex],
        entities,
      });
    },
  });
};
