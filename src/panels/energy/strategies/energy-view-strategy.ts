import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { visibleEnergyCards } from "./energy-cards";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/view-columns-conditions";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
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
      sidebar: {
        sections: [{ cards: [] }],
        visibility: [LARGE_SCREEN_CONDITION],
      },
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

    const mainCards: LovelaceCardConfig[] = [];
    const gaugeCards: LovelaceCardConfig[] = [];
    const sidebarSection = view.sidebar!.sections![0];

    // Card configs come from the catalog; this strategy only decides placement,
    // which differs by card: the distribution and grid-balance cards go in the
    // sidebar (with a small-screen mirror section), the gauges are grouped, and
    // everything else flows into the main column in catalog order.
    const visible = visibleEnergyCards(
      "electricity",
      { hass, prefs, collectionKey },
      hidden
    );
    const byType = new Map(visible.map((c) => [c.type, c.config]));

    const placeInSidebarWithMirror = (config: LovelaceCardConfig) => {
      sidebarSection.cards!.push(config);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [config],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    };

    const distribution = byType.get("energy-distribution");
    if (distribution) {
      placeInSidebarWithMirror(distribution);
    }

    const gridBalance = byType.get("energy-grid-balance");
    if (gridBalance) {
      placeInSidebarWithMirror(gridBalance);
    }

    const GAUGE_TYPES = [
      "energy-grid-neutrality-gauge",
      "energy-solar-consumed-gauge",
      "energy-self-sufficiency-gauge",
      "energy-carbon-consumed-gauge",
    ];
    for (const type of GAUGE_TYPES) {
      const gauge = byType.get(type);
      if (gauge) {
        gaugeCards.push(gauge);
      }
    }

    if (gaugeCards.length) {
      sidebarSection.cards!.push({
        type: "grid",
        columns: gaugeCards.length === 1 ? 1 : 2,
        cards: gaugeCards,
      });
      view.sections!.push({
        type: "grid",
        column_span: 1,
        visibility: [SMALL_SCREEN_CONDITION],
        cards:
          gaugeCards.length === 1
            ? [gaugeCards[0]]
            : gaugeCards.map((card) => ({
                ...card,
                grid_options: { columns: 6 },
              })),
      });
    }

    mainCards.push({
      type: "energy-compare",
      collection_key: collectionKey,
      grid_options: { columns: 36 },
    });

    // The remaining cards (graphs, tables, sankey, and any external cards) all
    // flow into the main column in catalog order.
    const SIDEBAR_TYPES = new Set([
      "energy-distribution",
      "energy-grid-balance",
      ...GAUGE_TYPES,
    ]);
    for (const { type, config } of visible) {
      if (!SIDEBAR_TYPES.has(type)) {
        mainCards.push(config);
      }
    }

    view.sections!.push({
      type: "grid",
      column_span: 3,
      cards: mainCards,
    });

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-view-strategy": EnergyViewStrategy;
  }
}
