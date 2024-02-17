import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { AreaFilterValue } from "../../../components/ha-area-filter";
import { getEnergyPreferences } from "../../../data/energy";
import { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../types";
import { generateDefaultViewConfig } from "../common/generate-lovelace-config";

export type OriginalStatesViewStrategyConfig = {
  type: "original-states";
  areas?: AreaFilterValue;
  hide_entities_without_area?: boolean;
  hide_energy?: boolean;
};

@customElement("original-states-view-strategy")
export class OriginalStatesViewStrategy extends ReactiveElement {
  static async generate(
    config: OriginalStatesViewStrategyConfig,
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
      energyPrefs,
      config.areas,
      config.hide_entities_without_area,
      config.hide_energy
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

declare global {
  interface HTMLElementTagNameMap {
    "original-states-view-strategy": OriginalStatesViewStrategy;
  }
}
