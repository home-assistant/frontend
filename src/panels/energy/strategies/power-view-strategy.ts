import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import {
  buildEnergyViewCards,
  hasGasRateSource,
  hasPowerDevices,
  hasPowerSources,
  hasWaterRateDevices,
  hasWaterRateSource,
} from "./energy-cards";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("power-view-strategy")
export class PowerViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
    const hidden = _config.hidden_cards;

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
      // The "Now" view is real-time; roll its day period over at midnight.
      midnightRollover: true,
    });
    if (!energyCollection.prefs) {
      await energyCollection.refresh();
    }
    const prefs = energyCollection.prefs;

    const chartsSection: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };
    const badges: LovelaceBadgeConfig[] = [];

    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [chartsSection],
    };

    const hasPowerSrc = !!prefs && hasPowerSources(prefs);
    const hasPowerDev = !!prefs && hasPowerDevices(prefs);
    const hasWaterDev = !!prefs && hasWaterRateDevices(prefs);
    const hasWaterSrc = !!prefs && hasWaterRateSource(prefs);
    const hasGasSrc = !!prefs && hasGasRateSource(prefs);

    // No sources configured
    if (
      !prefs ||
      (!hasPowerSrc &&
        !hasPowerDev &&
        !hasWaterDev &&
        !hasWaterSrc &&
        !hasGasSrc)
    ) {
      return view;
    }

    if (hasPowerSrc) {
      badges.push({
        type: "power-total",
        collection_key: collectionKey,
      });
    }

    if (hasGasSrc) {
      badges.push({
        type: "gas-total",
        collection_key: collectionKey,
      });
    }

    if (hasWaterSrc) {
      badges.push({
        type: "water-total",
        collection_key: collectionKey,
      });
    }

    prefs.energy_sources.forEach((source) => {
      if (source.type === "battery" && source.stat_soc) {
        badges.push({
          type: "entity",
          entity: source.stat_soc,
        });
      }
    });

    const powerSankeyGrouping = shouldShowFloorsAndAreas(
      prefs.device_consumption,
      hass,
      (d) => d.stat_rate
    );
    const waterFlowGrouping = shouldShowFloorsAndAreas(
      prefs.device_consumption_water,
      hass,
      (d) => d.stat_rate
    );

    chartsSection.cards!.push(
      ...buildEnergyViewCards(
        "now",
        prefs,
        hidden,
        hass.localize,
        collectionKey,
        { grid_options: { columns: 36 } },
        [
          { type: "power-sources-graph" },
          {
            type: "power-sankey",
            group_by_floor: powerSankeyGrouping,
            group_by_area: powerSankeyGrouping,
          },
          {
            type: "water-flow-sankey",
            group_by_floor: waterFlowGrouping,
            group_by_area: waterFlowGrouping,
          },
        ]
      )
    );

    if (badges.length) {
      view.badges = badges;
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-view-strategy": PowerViewStrategy;
  }
}
