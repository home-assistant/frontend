import type { LovelacePanelConfig } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../data/lovelace/config/types";
import {
  fetchConfig,
  isStrategyDashboard,
  saveConfig,
} from "../../../data/lovelace/config/types";
import { isStrategyView } from "../../../data/lovelace/config/view";
import { fetchDashboards } from "../../../data/lovelace/dashboard";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { SECTIONS_VIEW_LAYOUT } from "../views/const";
import { getViewType } from "../views/get-view-type";
import type { SuggestCardDialogParams } from "./card-editor/show-suggest-card-dialog";
import { showSuggestCardDialog } from "./card-editor/show-suggest-card-dialog";
import { showEditSectionDialog } from "./section-editor/show-edit-section-dialog";
import { showSelectViewDialog } from "./select-view/show-select-view-dialog";

export type AddToViewCardDialogParams = Pick<
  SuggestCardDialogParams,
  "lovelaceConfig" | "saveConfig" | "path" | "yaml"
>;

export interface AddEntitiesToViewOptions {
  cardConfig?: LovelaceCardConfig[];
  sectionConfig?: LovelaceSectionConfig;
  entities?: string[];
  sectionStrategy?: LovelaceStrategyConfig;
  showCardDialog?: (params: AddToViewCardDialogParams) => void;
}

export const addEntitiesToLovelaceView = async (
  element: HTMLElement,
  hass: HomeAssistant,
  options: AddEntitiesToViewOptions
) => {
  const { sectionStrategy } = options;
  const showCardDialog =
    options.showCardDialog ??
    ((params: AddToViewCardDialogParams) =>
      showSuggestCardDialog(element, {
        ...params,
        cardConfig: options.cardConfig ?? [],
        sectionConfig: options.sectionConfig,
        entities: options.entities,
      }));
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
    showCardDialog({ yaml: true });
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
      showCardDialog({ yaml: true });
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

  const showAddDialog = (
    viewUrlPath: string | null,
    config: LovelaceConfig,
    viewIndex: number
  ) => {
    const save = async (newConfig: LovelaceConfig): Promise<void> => {
      try {
        await saveConfig(hass!, viewUrlPath, newConfig);
      } catch (_err: any) {
        alert(hass.localize("ui.panel.lovelace.add_entities.saving_failed"));
      }
    };

    const view = config.views[viewIndex];
    if (
      sectionStrategy &&
      !isStrategyView(view) &&
      getViewType(view) === SECTIONS_VIEW_LAYOUT
    ) {
      showEditSectionDialog(element, {
        lovelaceConfig: config,
        saveConfig: save,
        path: ["views", viewIndex, "sections", view.sections?.length ?? 0],
        newSection: { strategy: sectionStrategy },
      });
      return;
    }

    showCardDialog({
      lovelaceConfig: config,
      saveConfig: save,
      path: ["views", viewIndex],
    });
  };

  if (!storageDashs.length && lovelaceConfig.views.length === 1) {
    showAddDialog(null, lovelaceConfig, 0);
    return;
  }

  showSelectViewDialog(element, {
    lovelaceConfig,
    urlPath,
    allowDashboardChange: true,
    actionLabel: hass.localize("ui.common.next"),
    dashboards,
    viewSelectedCallback: showAddDialog,
  });
};
