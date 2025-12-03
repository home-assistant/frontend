import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { getEnergyDataCollection } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";

@customElement("gas-view-strategy")
export class GasViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [{ type: "grid", cards: [] }],
    };

    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    const prefs = energyCollection.prefs;

    const hasGasSources = prefs?.energy_sources.some(
      (source) => source.type === "gas"
    );

    // No gas sources available
    if (!prefs || !hasGasSources) {
      return view;
    }

    const section = view.sections![0] as LovelaceSectionConfig;

    section.cards!.push({
      type: "energy-date-selection",
      collection_key: collectionKey,
    });
    section.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
    });

    section.cards!.push({
      title: hass.localize("ui.panel.energy.cards.energy_gas_graph_title"),
      type: "energy-gas-graph",
      collection_key: collectionKey,
    });

    section.cards!.push({
      title: hass.localize("ui.panel.energy.cards.energy_sources_table_title"),
      type: "energy-sources-table",
      collection_key: collectionKey,
      types: ["gas"],
    });

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "gas-view-strategy": GasViewStrategy;
  }
}
