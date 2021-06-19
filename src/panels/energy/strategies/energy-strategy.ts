import { EnergyPreferences, getEnergyPreferences } from "../../../data/energy";
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

    if (energyPrefs.stat_house_energy_meter) {
      view.cards!.push({
        type: "statistics-graph",
        title: hass.localize("ui.panel.energy.charts.stat_house_energy_meter"),
        entities: [energyPrefs.stat_house_energy_meter],
        days_to_show: 1,
        chart_plugins: ["datalabels"],
        chart_options: {
          plugins: {
            tooltip: { enabled: false },
            datalabels: {
              align: "end",
              anchor: "end",
              display: "auto",
              formatter: (value) => value.y,
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
    }

    if (energyPrefs.stat_solar_generatation) {
      const entities = [energyPrefs.stat_solar_generatation];
      if (energyPrefs.stat_solar_return_to_grid) {
        entities.push(energyPrefs.stat_solar_return_to_grid);
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
    }

    if (energyPrefs.stat_solar_predicted_generation) {
      view.cards!.push({
        type: "statistics-graph",
        title: hass.localize("ui.panel.energy.charts.solar"),
        entities: [energyPrefs.stat_solar_predicted_generation],
      });
    }

    if (energyPrefs.stat_device_consumption.length) {
      view.cards!.push({
        title: hass.localize("ui.panel.energy.charts.by_device"),
        type: "statistics-graph",
        entities: energyPrefs.stat_device_consumption,
      });
    }

    if (!view.cards?.length) {
      return setupWizard();
    }

    return view;
  }
}
