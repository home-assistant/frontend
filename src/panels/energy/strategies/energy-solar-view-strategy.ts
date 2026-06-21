import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { GridSourceTypeEnergyPreference } from "../../../data/energy";
import { getEnergyDataCollection } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../constants";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { isEnergyCardHidden } from "./energy-cards";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/view-columns-conditions";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("energy-solar-view-strategy")
export class EnergySolarViewStrategy extends ReactiveElement {
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
    if (
      !prefs ||
      (prefs.device_consumption.length === 0 &&
        prefs.energy_sources.length === 0)
    ) {
      return view;
    }

    const hasGrid = prefs.energy_sources.find(
      (source): source is GridSourceTypeEnergyPreference =>
        source.type === "grid" &&
        (!!source.stat_energy_from || !!source.stat_energy_to)
    );
    const hasReturn = prefs.energy_sources.some(
      (source) => source.type === "grid" && !!source.stat_energy_to
    );
    const hasSolar = prefs.energy_sources.some(
      (source) => source.type === "solar"
    );
    const hasBattery = prefs.energy_sources.some(
      (source) => source.type === "battery"
    );

    const mainCards: LovelaceCardConfig[] = [];
    const gaugeCards: LovelaceCardConfig[] = [];
    const sidebarSection = view.sidebar!.sections![0];

    // Solar scene + timeline pinned to the top of the main column, full width (same placement as
    // the Electricity view they used to live on).
    if (
      (hasGrid || hasSolar || hasBattery) &&
      !isEnergyCardHidden("solar", "energy-solar-scene", hidden)
    ) {
      mainCards.push({
        type: "energy-solar-scene",
        title: hass.localize("ui.panel.energy.cards.energy_solar_scene_title"),
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
      mainCards.push({
        type: "energy-solar-scene-timeline",
        title: hass.localize(
          "ui.panel.energy.cards.energy_solar_scene_timeline_title"
        ),
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }

    if (hasSolar && !isEnergyCardHidden("solar", "energy-clock", hidden)) {
      const radialCard = {
        title: hass.localize("ui.panel.energy.cards.energy_clock_title"),
        type: "energy-clock",
        collection_key: collectionKey,
      };
      sidebarSection.cards!.push(radialCard);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [radialCard],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    }

    if (
      (hasGrid || hasBattery || hasSolar) &&
      !isEnergyCardHidden("solar", "energy-distribution", hidden)
    ) {
      const distributionCard = {
        title: hass.localize("ui.panel.energy.cards.energy_distribution_title"),
        type: "energy-distribution",
        collection_key: collectionKey,
      };
      sidebarSection.cards!.push(distributionCard);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [distributionCard],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    }

    if (
      hasGrid &&
      hasReturn &&
      !isEnergyCardHidden("solar", "energy-grid-balance", hidden)
    ) {
      const gridResultCard = {
        type: "energy-grid-balance",
        collection_key: collectionKey,
      };
      sidebarSection.cards!.push(gridResultCard);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        visibility: [SMALL_SCREEN_CONDITION],
        cards: [gridResultCard],
      });
    }

    // Net imported from the grid.
    if (
      hasReturn &&
      !isEnergyCardHidden("solar", "energy-grid-neutrality-gauge", hidden)
    ) {
      gaugeCards.push({
        type: "energy-grid-neutrality-gauge",
        collection_key: collectionKey,
      });
    }
    if (hasSolar) {
      // Self-consumed solar energy.
      if (
        hasReturn &&
        !isEnergyCardHidden("solar", "energy-solar-consumed-gauge", hidden)
      ) {
        gaugeCards.push({
          type: "energy-solar-consumed-gauge",
          collection_key: collectionKey,
        });
      }
      // Self-sufficiency.
      if (
        hasGrid &&
        !isEnergyCardHidden("solar", "energy-self-sufficiency-gauge", hidden)
      ) {
        gaugeCards.push({
          type: "energy-self-sufficiency-gauge",
          collection_key: collectionKey,
        });
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

    // Solar production.
    if (
      hasSolar &&
      !isEnergyCardHidden("solar", "energy-solar-graph", hidden)
    ) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_solar_graph_title"),
        type: "energy-solar-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
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
    "energy-solar-view-strategy": EnergySolarViewStrategy;
  }
}
