import { HomeAssistant } from "../../../types";
import {
  LovelaceConfig,
  fetchConfig,
  saveConfig,
} from "../../../data/lovelace";
import { showSelectViewDialog } from "./select-view/show-select-view-dialog";
import { showSuggestCardDialog } from "./card-editor/show-suggest-card-dialog";

export const addEntitiesToLovelaceView = async (
  element: HTMLElement,
  hass: HomeAssistant,
  entities: string[],
  lovelaceConfig?: LovelaceConfig,
  saveConfigFunc?: (newConfig: LovelaceConfig) => void
) => {
  if ((hass!.panels.lovelace?.config as any)?.mode === "yaml") {
    showSuggestCardDialog(element, {
      entities,
    });
    return;
  }
  if (!lovelaceConfig) {
    try {
      lovelaceConfig = await fetchConfig(hass.connection, false);
    } catch {
      alert(
        hass.localize(
          "ui.panel.lovelace.editor.add_entities.generated_unsupported"
        )
      );
      return;
    }
  }
  if (!lovelaceConfig.views.length) {
    alert(
      "You don't have any Lovelace views, first create a view in Lovelace."
    );
    return;
  }
  if (!saveConfigFunc) {
    saveConfigFunc = async (newConfig: LovelaceConfig): Promise<void> => {
      try {
        await saveConfig(hass!, newConfig);
      } catch {
        alert(
          hass.localize("ui.panel.config.devices.add_entities.saving_failed")
        );
      }
    };
  }
  if (lovelaceConfig.views.length === 1) {
    showSuggestCardDialog(element, {
      lovelaceConfig: lovelaceConfig!,
      saveConfig: saveConfigFunc,
      path: [0],
      entities,
    });
    return;
  }
  showSelectViewDialog(element, {
    lovelaceConfig,
    viewSelectedCallback: (view) => {
      showSuggestCardDialog(element, {
        lovelaceConfig: lovelaceConfig!,
        saveConfig: saveConfigFunc,
        path: [view],
        entities,
      });
    },
  });
};
