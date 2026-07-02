import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { hasGasSource, visibleEnergyCards } from "./energy-cards";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("gas-view-strategy")
export class GasViewStrategy extends ReactiveElement {
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
      max_columns: 3,
      sections: [{ type: "grid", cards: [], column_span: 3 }],
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

    // No gas sources available
    if (!prefs || !hasGasSource(prefs)) {
      return view;
    }

    const section = view.sections![0] as LovelaceSectionConfig;

    section.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
      grid_options: {
        columns: 36,
      },
    });

    for (const { config } of visibleEnergyCards(
      "gas",
      { hass, prefs, collectionKey },
      hidden
    )) {
      section.cards!.push(config);
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "gas-view-strategy": GasViewStrategy;
  }
}
