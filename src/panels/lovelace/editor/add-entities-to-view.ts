import { HomeAssistant } from "../../../types";
import {
  LovelaceConfig,
  fetchConfig,
  saveConfig,
} from "../../../data/lovelace";
import { showSelectViewDialog } from "./select-view/show-select-view-dialog";
import { showEditCardDialog } from "./card-editor/show-edit-card-dialog";

export const addEntitiesToLovelaceView = async (
  element: HTMLElement,
  hass: HomeAssistant,
  entities: string[],
  lovelaceConfig?: LovelaceConfig,
  saveConfigFunc?: (newConfig: LovelaceConfig) => void
) => {
  if ((hass!.panels.lovelace?.config as any)?.mode === "yaml") {
    alert(
      hass.localize("ui.panel.lovelace.editor.add_entities.yaml_unsupported")
    );
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
  showSelectViewDialog(element, {
    lovelaceConfig,
    viewSelectedCallback: (view) => {
      if (!saveConfigFunc) {
        saveConfigFunc = async (newConfig: LovelaceConfig): Promise<void> => {
          try {
            await saveConfig(hass!, newConfig);
          } catch {
            alert(
              hass.localize(
                "ui.panel.config.devices.add_entities.saving_failed"
              )
            );
          }
        };
      }

      showEditCardDialog(element, {
        lovelaceConfig: lovelaceConfig!,
        saveConfig: saveConfigFunc,
        path: [view],
        entities,
      });
    },
  });
};
