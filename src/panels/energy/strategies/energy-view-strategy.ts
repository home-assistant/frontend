import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { GridSourceTypeEnergyPreference } from "../../../data/energy";
import { getEnergyDataCollection } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../ha-panel-energy";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/screen-conditions";

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
  static async generate(
    _config: LovelaceStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;

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

    if (hasGrid || hasBattery || hasSolar) {
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

    // Only include if we have a grid source & return.
    if (hasReturn) {
      const card = {
        type: "energy-grid-neutrality-gauge",
        collection_key: collectionKey,
      };
      gaugeCards.push(card);
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      if (hasReturn) {
        const card = {
          type: "energy-solar-consumed-gauge",
          collection_key: collectionKey,
        };
        gaugeCards.push(card);
      }
      if (hasGrid) {
        const card = {
          type: "energy-self-sufficiency-gauge",
          collection_key: collectionKey,
        };
        gaugeCards.push(card);
      }
    }

    // Only include if we have a grid
    if (hasGrid) {
      const card = {
        type: "energy-carbon-consumed-gauge",
        collection_key: collectionKey,
      };
      gaugeCards.push(card);
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

    // Only include if we have a grid or battery.
    if (hasGrid || hasBattery) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_usage_graph_title"),
        type: "energy-usage-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }

    // Only include if we have a solar source.
    if (hasSolar) {
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_solar_graph_title"),
        type: "energy-solar-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
    }

    if (hasGrid || hasSolar || hasBattery) {
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["grid", "solar", "battery"],
        grid_options: { columns: 36 },
      });
    }

    // Only include if we have at least 1 device in the config.
    if (prefs.device_consumption.length) {
      const showFloorsAndAreas = shouldShowFloorsAndAreas(
        prefs.device_consumption,
        hass,
        (d) => d.stat_consumption
      );
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_detail_graph_title"
        ),
        type: "energy-devices-detail-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
      mainCards.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_devices_graph_title"
        ),
        type: "energy-devices-graph",
        collection_key: collectionKey,
        grid_options: { columns: 36 },
      });
      mainCards.push({
        title: hass.localize("ui.panel.energy.cards.energy_sankey_title"),
        type: "energy-sankey",
        collection_key: collectionKey,
        group_by_floor: showFloorsAndAreas,
        group_by_area: showFloorsAndAreas,
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
    "energy-view-strategy": EnergyViewStrategy;
  }
}
