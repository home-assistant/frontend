import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { visibleEnergyCards } from "./energy-cards";

@customElement("energy-overview-view-strategy")
export class EnergyOverviewViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
    const hidden = _config.hidden_cards;

    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [],
      dense_section_placement: true,
      max_columns: 3,
      footer: {
        card: {
          type: "energy-date-selection",
          collection_key: collectionKey,
          opening_direction: "right",
          vertical_opening_direction: "up",
        },
      },
    };

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    if (!energyCollection.prefs) {
      await energyCollection.refresh();
    }
    const prefs = energyCollection.prefs;

    // No energy sources available
    if (
      !prefs ||
      (prefs.device_consumption.length === 0 &&
        prefs.energy_sources.length === 0)
    ) {
      return view;
    }

    for (const { config } of visibleEnergyCards(
      "overview",
      { hass, prefs, collectionKey },
      hidden
    )) {
      view.sections!.push({ type: "grid", cards: [config] });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-overview-view-strategy": EnergyOverviewViewStrategy;
  }
}
