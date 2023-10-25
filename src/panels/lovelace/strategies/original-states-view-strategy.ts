import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { getEnergyPreferences } from "../../../data/energy";
import {
  LovelaceStrategyConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { generateDefaultViewConfig } from "../common/generate-lovelace-config";

@customElement("original-states-view-strategy")
export class OriginalStatesViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    if (hass.config.state === STATE_NOT_RUNNING) {
      return {
        cards: [{ type: "starting" }],
      };
    }

    if (hass.config.recovery_mode) {
      return {
        cards: [{ type: "recovery-mode" }],
      };
    }

    const [localize, energyPrefs] = await Promise.all([
      hass.loadBackendTranslation("title"),
      isComponentLoaded(hass, "energy")
        ? // It raises if not configured, just swallow that.
          getEnergyPreferences(hass).catch(() => undefined)
        : undefined,
    ]);

    // User can override default view. If they didn't, we will add one
    // that contains all entities.
    const view = generateDefaultViewConfig(
      hass.areas,
      hass.devices,
      hass.entities,
      hass.states,
      localize,
      energyPrefs
    );

    // Add map of geo locations to default view if loaded
    if (hass.config.components.includes("geo_location")) {
      if (view && view.cards) {
        view.cards.push({
          type: "map",
          geo_location_sources: ["all"],
        });
      }
    }

    // User has no entities
    if (view.cards!.length === 0) {
      view.cards!.push({
        type: "empty-state",
      });
    }

    return view;
  }
}
