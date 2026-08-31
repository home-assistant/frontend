import type { LovelacePanelConfig } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../data/lovelace/config/types";
import {
  fetchConfig,
  isStrategyDashboard,
  saveConfig,
} from "../../../data/lovelace/config/types";
import { fetchDashboards } from "../../../data/lovelace/dashboard";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { showSuggestCardDialog } from "./card-editor/show-suggest-card-dialog";
import { showSelectViewDialog } from "./select-view/show-select-view-dialog";

export const addEntitiesToLovelaceView = async (
  element: HTMLElement,
  hass: HomeAssistant,
  cardConfig: LovelaceCardConfig[],
  sectionConfig?: LovelaceSectionConfig,
  entities?: string[]
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
      cardConfig,
      entities,
      yaml: true,
    });
    return;
  }

  // A strategy dashboard has no views of its own until the user takes control.
  const hasViewList = (
    config: LovelaceRawConfig | undefined
  ): config is LovelaceConfig => !!config && !isStrategyDashboard(config);

  const hasViews = (config: LovelaceRawConfig | undefined) =>
    hasViewList(config) && !!config.views?.length;

  let lovelaceConfig: LovelaceRawConfig | undefined;
  let urlPath: string | null = null;
  if (mainLovelaceMode === "storage") {
    try {
      lovelaceConfig = await fetchConfig(hass.connection, null, false);
    } catch (_err: any) {
      // default dashboard is in generated mode
    }
  }

  if (!hasViews(lovelaceConfig)) {
    // Prefer a dashboard that has views to add the card to, but keep the first
    // usable one as a fallback so the user still gets the dashboard picker.
    for (const storageDash of storageDashs) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const dashConfig = await fetchConfig(
          hass.connection,
          storageDash.url_path,
          false
        );
        if (!hasViewList(dashConfig)) {
          continue;
        }
        if (!hasViewList(lovelaceConfig)) {
          lovelaceConfig = dashConfig;
          urlPath = storageDash.url_path;
        }
        if (hasViews(dashConfig)) {
          lovelaceConfig = dashConfig;
          urlPath = storageDash.url_path;
          break;
        }
      } catch (_err: any) {
        // dashboard is in generated mode
      }
    }
  }

  if (!hasViewList(lovelaceConfig)) {
    if (dashboards.length > storageDashs.length) {
      // all storage dashboards are generated, but we have YAML dashboards just show the YAML config
      showSuggestCardDialog(element, {
        cardConfig,
        sectionConfig,
        entities,
        yaml: true,
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
      cardConfig,
      sectionConfig,
      lovelaceConfig,
      saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
        try {
          await saveConfig(hass!, null, newConfig);
        } catch (_err: any) {
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
        cardConfig,
        sectionConfig,
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
