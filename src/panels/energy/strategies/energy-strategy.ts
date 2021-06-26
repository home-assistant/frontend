import {
  EnergyPreferences,
  energySourcesByType,
  FlowToGridSourceEnergyPreference,
  getEnergyPreferences,
} from "../../../data/energy";
import { LovelaceViewConfig } from "../../../data/lovelace";
import { LovelaceViewStrategy } from "../../lovelace/strategies/get-strategy";

const setupWizard = async (): Promise<LovelaceViewConfig> => {
  await import("../cards/energy-setup-wizard-card");
  return {
    type: "panel",
    cards: [
      {
        type: "custom:energy-setup-wizard-card",
      },
    ],
  };
};

export class EnergyStrategy {
  static async generateView(
    info: Parameters<LovelaceViewStrategy["generateView"]>[0]
  ): ReturnType<LovelaceViewStrategy["generateView"]> {
    const hass = info.hass;

    const view: LovelaceViewConfig = { cards: [] };

    let energyPrefs: EnergyPreferences;

    try {
      energyPrefs = await getEnergyPreferences(hass);
    } catch (e) {
      if (e.code === "not_found") {
        return setupWizard();
      }
      view.cards!.push({
        type: "markdown",
        content: `An error occured while fetching your energy preferences: ${e.message}.`,
      });
      return view;
    }

    view.cards!.push({
      type: "energy-summary",
      prefs: energyPrefs,
    });

    const prefTypes = energySourcesByType(energyPrefs);
    let flowToGridSources: FlowToGridSourceEnergyPreference[] | undefined;

    if (prefTypes.grid) {
      view.cards!.push({
        type: "statistics-graph",
        title: hass.localize("ui.panel.energy.charts.stat_house_energy_meter"),
        entities: prefTypes.grid[0].flow_from.map((flow) => flow.stat_from),
        days_to_show: 20,
        chart_plugins: ["datalabels"],
      });

      if (prefTypes.grid[0].flow_to.length) {
        flowToGridSources = prefTypes.grid[0].flow_to;
      }
    }

    if (prefTypes.solar) {
      const solarSource = prefTypes.solar[0];
      const entities = [solarSource.stat_from];

      if (flowToGridSources) {
        entities.push(...flowToGridSources.map((flow) => flow.stat_to));
      }
      view.cards!.push({
        type: "statistics-graph",
        title: hass.localize("ui.panel.energy.charts.solar"),
        entities,
        days_to_show: 10,
        chart_plugins: ["datalabels"],
        chart_options: {
          plugins: {
            tooltip: { enabled: false },
            datalabels: {
              align: "top",
              anchor: "end",
              offset: 6,
              borderRadius: 4,
              color: "white",
              font: {
                weight: "bold",
              },
              padding: 6,
              formatter: (value) => value.y,
              display: (context) =>
                context.datasetIndex === 0 && context.dataIndex % 10 === 0
                  ? "auto"
                  : false,
              backgroundColor: function (context) {
                return context.dataset.backgroundColor;
              },
            },
          },
          elements: {
            line: {
              tension: 0.6,
              borderWidth: 3,
            },
          },
        },
      });

      if (prefTypes.solar[0].stat_predicted_from) {
        view.cards!.push({
          type: "statistics-graph",
          title: hass.localize("ui.panel.energy.charts.solar"),
          entities: [prefTypes.solar[0].stat_predicted_from],
        });
      }
    }

    if (energyPrefs.device_consumption.length) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.charts.by_device"),
        type: "statistics-graph",
        entities: energyPrefs.device_consumption.map(
          (dev) => dev.stat_consumption
        ),
      });
    }

    return view;
  }
}
