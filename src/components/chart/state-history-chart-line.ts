import type { ChartData, ChartDataset, ChartOptions } from "chart.js";
import { html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import { getGraphColorByIndex } from "../../common/color/colors";
import {
  formatNumber,
  numberFormatToLocale,
} from "../../common/number/format_number";
import { LineChartEntity, LineChartState } from "../../data/history";
import { HomeAssistant } from "../../types";
import { MIN_TIME_BETWEEN_UPDATES } from "./ha-chart-base";

const safeParseFloat = (value) => {
  const parsed = parseFloat(value);
  return isFinite(parsed) ? parsed : null;
};

class StateHistoryChartLine extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: LineChartEntity[] = [];

  @property() public names: boolean | Record<string, string> = false;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ type: Boolean }) public isSingleDevice = false;

  @property({ attribute: false }) public endTime!: Date;

  @state() private _chartData?: ChartData<"line">;

  @state() private _chartOptions?: ChartOptions;

  private _chartTime: Date = new Date();

  protected render() {
    return html`
      <ha-chart-base
        .data=${this._chartData}
        .options=${this._chartOptions}
        chart-type="line"
      ></ha-chart-base>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._chartOptions = {
        parsing: false,
        animation: false,
        scales: {
          x: {
            type: "time",
            adapters: {
              date: {
                locale: this.hass.locale,
              },
            },
            suggestedMax: this.endTime,
            ticks: {
              maxRotation: 0,
              sampleSize: 5,
              autoSkipPadding: 20,
              major: {
                enabled: true,
              },
              font: (context) =>
                context.tick && context.tick.major
                  ? ({ weight: "bold" } as any)
                  : {},
            },
            time: {
              tooltipFormat: "datetimeseconds",
            },
          },
          y: {
            ticks: {
              maxTicksLimit: 7,
            },
            title: {
              display: true,
              text: this.unit,
            },
          },
        },
        plugins: {
          tooltip: {
            mode: "nearest",
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${formatNumber(
                  context.parsed.y,
                  this.hass.locale
                )} ${this.unit}`,
            },
          },
          filler: {
            propagate: true,
          },
          legend: {
            display: !this.isSingleDevice,
            labels: {
              usePointStyle: true,
            },
          },
        },
        hover: {
          mode: "nearest",
        },
        elements: {
          line: {
            tension: 0.1,
            borderWidth: 1.5,
          },
          point: {
            hitRadius: 5,
          },
        },
        // @ts-expect-error
        locale: numberFormatToLocale(this.hass.locale),
      };
    }
    if (
      changedProps.has("data") ||
      this._chartTime <
        new Date(this.endTime.getTime() - MIN_TIME_BETWEEN_UPDATES)
    ) {
      // If the line is more than 5 minutes old, re-gen it
      // so the X axis grows even if there is no new data
      this._generateData();
    }
  }

  private _generateData() {
    let colorIndex = 0;
    const computedStyles = getComputedStyle(this);
    const entityStates = this.data;
    const datasets: ChartDataset<"line">[] = [];
    if (entityStates.length === 0) {
      return;
    }

    this._chartTime = new Date();
    const endTime = this.endTime;
    const names = this.names || {};
    entityStates.forEach((states) => {
      const domain = states.domain;
      const name = names[states.entity_id] || states.name;
      // array containing [value1, value2, etc]
      let prevValues: any[] | null = null;

      const data: ChartDataset<"line">[] = [];

      const pushData = (timestamp: Date, datavalues: any[] | null) => {
        if (!datavalues) return;
        if (timestamp > endTime) {
          // Drop data points that are after the requested endTime. This could happen if
          // endTime is "now" and client time is not in sync with server time.
          return;
        }
        data.forEach((d, i) => {
          if (datavalues[i] === null && prevValues && prevValues[i] !== null) {
            // null data values show up as gaps in the chart.
            // If the current value for the dataset is null and the previous
            // value of the data set is not null, then add an 'end' point
            // to the chart for the previous value. Otherwise the gap will
            // be too big. It will go from the start of the previous data
            // value until the start of the next data value.
            d.data.push({ x: timestamp.getTime(), y: prevValues[i] });
          }
          d.data.push({ x: timestamp.getTime(), y: datavalues[i] });
        });
        prevValues = datavalues;
      };

      const addDataSet = (nameY: string, fill = false, color?: string) => {
        if (!color) {
          color = getGraphColorByIndex(colorIndex, computedStyles);
          colorIndex++;
        }
        data.push({
          label: nameY,
          fill: fill ? "origin" : false,
          borderColor: color,
          backgroundColor: color + "7F",
          stepped: "before",
          pointRadius: 0,
          data: [],
        });
      };

      if (
        domain === "thermostat" ||
        domain === "climate" ||
        domain === "water_heater"
      ) {
        const hasHvacAction = states.states.some(
          (entityState) => entityState.attributes?.hvac_action
        );

        const isHeating =
          domain === "climate" && hasHvacAction
            ? (entityState: LineChartState) =>
                entityState.attributes?.hvac_action === "heating"
            : (entityState: LineChartState) => entityState.state === "heat";
        const isCooling =
          domain === "climate" && hasHvacAction
            ? (entityState: LineChartState) =>
                entityState.attributes?.hvac_action === "cooling"
            : (entityState: LineChartState) => entityState.state === "cool";

        const hasHeat = states.states.some(isHeating);
        const hasCool = states.states.some(isCooling);
        // We differentiate between thermostats that have a target temperature
        // range versus ones that have just a target temperature

        // Using step chart by step-before so manually interpolation not needed.
        const hasTargetRange = states.states.some(
          (entityState) =>
            entityState.attributes &&
            entityState.attributes.target_temp_high !==
              entityState.attributes.target_temp_low
        );
        addDataSet(
          `${this.hass.localize("ui.card.climate.current_temperature", {
            name: name,
          })}`
        );
        if (hasHeat) {
          addDataSet(
            `${this.hass.localize("ui.card.climate.heating", { name: name })}`,
            true,
            computedStyles.getPropertyValue("--state-climate-heat-color")
          );
          // The "heating" series uses steppedArea to shade the area below the current
          // temperature when the thermostat is calling for heat.
        }
        if (hasCool) {
          addDataSet(
            `${this.hass.localize("ui.card.climate.cooling", { name: name })}`,
            true,
            computedStyles.getPropertyValue("--state-climate-cool-color")
          );
          // The "cooling" series uses steppedArea to shade the area below the current
          // temperature when the thermostat is calling for heat.
        }

        if (hasTargetRange) {
          addDataSet(
            `${this.hass.localize("ui.card.climate.target_temperature_mode", {
              name: name,
              mode: this.hass.localize("ui.card.climate.high"),
            })}`
          );
          addDataSet(
            `${this.hass.localize("ui.card.climate.target_temperature_mode", {
              name: name,
              mode: this.hass.localize("ui.card.climate.low"),
            })}`
          );
        } else {
          addDataSet(
            `${this.hass.localize("ui.card.climate.target_temperature_entity", {
              name: name,
            })}`
          );
        }

        states.states.forEach((entityState) => {
          if (!entityState.attributes) return;
          const curTemp = safeParseFloat(
            entityState.attributes.current_temperature
          );
          const series = [curTemp];
          if (hasHeat) {
            series.push(isHeating(entityState) ? curTemp : null);
          }
          if (hasCool) {
            series.push(isCooling(entityState) ? curTemp : null);
          }
          if (hasTargetRange) {
            const targetHigh = safeParseFloat(
              entityState.attributes.target_temp_high
            );
            const targetLow = safeParseFloat(
              entityState.attributes.target_temp_low
            );
            series.push(targetHigh, targetLow);
            pushData(new Date(entityState.last_changed), series);
          } else {
            const target = safeParseFloat(entityState.attributes.temperature);
            series.push(target);
            pushData(new Date(entityState.last_changed), series);
          }
        });
      } else if (domain === "humidifier") {
        addDataSet(
          `${this.hass.localize("ui.card.humidifier.target_humidity_entity", {
            name: name,
          })}`
        );
        addDataSet(
          `${this.hass.localize("ui.card.humidifier.on_entity", {
            name: name,
          })}`,
          true
        );

        states.states.forEach((entityState) => {
          if (!entityState.attributes) return;
          const target = safeParseFloat(entityState.attributes.humidity);
          const series = [target];
          series.push(entityState.state === "on" ? target : null);
          pushData(new Date(entityState.last_changed), series);
        });
      } else {
        addDataSet(name);

        let lastValue: number;
        let lastDate: Date;
        let lastNullDate: Date | null = null;

        // Process chart data.
        // When state is `unknown`, calculate the value and break the line.
        states.states.forEach((entityState) => {
          const value = safeParseFloat(entityState.state);
          const date = new Date(entityState.last_changed);
          if (value !== null && lastNullDate) {
            const dateTime = date.getTime();
            const lastNullDateTime = lastNullDate.getTime();
            const lastDateTime = lastDate?.getTime();
            const tmpValue =
              (value - lastValue) *
                ((lastNullDateTime - lastDateTime) /
                  (dateTime - lastDateTime)) +
              lastValue;
            pushData(lastNullDate, [tmpValue]);
            pushData(new Date(lastNullDateTime + 1), [null]);
            pushData(date, [value]);
            lastDate = date;
            lastValue = value;
            lastNullDate = null;
          } else if (value !== null && lastNullDate === null) {
            pushData(date, [value]);
            lastDate = date;
            lastValue = value;
          } else if (
            value === null &&
            lastNullDate === null &&
            lastValue !== undefined
          ) {
            lastNullDate = date;
          }
        });
      }

      // Add an entry for final values
      pushData(endTime, prevValues);

      // Concat two arrays
      Array.prototype.push.apply(datasets, data);
    });

    this._chartData = {
      datasets,
    };
  }
}
customElements.define("state-history-chart-line", StateHistoryChartLine);

declare global {
  interface HTMLElementTagNameMap {
    "state-history-chart-line": StateHistoryChartLine;
  }
}
