import "@polymer/polymer/lib/utils/debounce";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./entity/ha-chart-base";

import LocalizeMixin from "../mixins/localize-mixin";
import { formatDateTimeWithSeconds } from "../common/datetime/format_date_time";

class StateHistoryChartLine extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          overflow: hidden;
          height: 0;
          transition: height 0.3s ease-in-out;
        }
      </style>
      <ha-chart-base
        id="chart"
        data="[[chartData]]"
        identifier="[[identifier]]"
        rendered="{{rendered}}"
      ></ha-chart-base>
    `;
  }

  static get properties() {
    return {
      chartData: Object,
      data: Object,
      names: Object,
      unit: String,
      identifier: String,

      isSingleDevice: {
        type: Boolean,
        value: false,
      },

      endTime: Object,
      rendered: {
        type: Boolean,
        value: false,
        observer: "_onRenderedChanged",
      },
    };
  }

  static get observers() {
    return ["dataChanged(data, endTime, isSingleDevice)"];
  }

  connectedCallback() {
    super.connectedCallback();
    this._isAttached = true;
    this.drawChart();
  }

  dataChanged() {
    this.drawChart();
  }

  _onRenderedChanged(rendered) {
    if (rendered) this.animateHeight();
  }

  animateHeight() {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.style.height = this.$.chart.scrollHeight + "px";
      })
    );
  }

  drawChart() {
    const unit = this.unit;
    const deviceStates = this.data;
    const datasets = [];
    let endTime;

    if (!this._isAttached) {
      return;
    }

    if (deviceStates.length === 0) {
      return;
    }

    function safeParseFloat(value) {
      const parsed = parseFloat(value);
      return isFinite(parsed) ? parsed : null;
    }

    endTime =
      this.endTime ||
      // Get the highest date from the last date of each device
      new Date(
        Math.max.apply(
          null,
          deviceStates.map(
            (devSts) =>
              new Date(devSts.states[devSts.states.length - 1].last_changed)
          )
        )
      );
    if (endTime > new Date()) {
      endTime = new Date();
    }

    const names = this.names || {};
    deviceStates.forEach((states) => {
      const domain = states.domain;
      const name = names[states.entity_id] || states.name;
      // array containing [value1, value2, etc]
      let prevValues;
      const data = [];

      function pushData(timestamp, datavalues) {
        if (!datavalues) return;
        if (timestamp > endTime) {
          // Drop datapoints that are after the requested endTime. This could happen if
          // endTime is "now" and client time is not in sync with server time.
          return;
        }
        data.forEach((d, i) => {
          d.data.push({ x: timestamp, y: datavalues[i] });
        });
        prevValues = datavalues;
      }

      function addColumn(nameY, step, fill) {
        let dataFill = false;
        let dataStep = false;
        if (fill) {
          dataFill = "origin";
        }
        if (step) {
          dataStep = "before";
        }
        data.push({
          label: nameY,
          fill: dataFill,
          steppedLine: dataStep,
          pointRadius: 0,
          data: [],
          unitText: unit,
        });
      }

      if (
        domain === "thermostat" ||
        domain === "climate" ||
        domain === "water_heater"
      ) {
        const hasHvacAction = states.states.some(
          (state) => state.attributes && state.attributes.hvac_action
        );

        const isHeating =
          domain === "climate" && hasHvacAction
            ? (state) => state.attributes.hvac_action === "heating"
            : (state) => state.state === "heat";
        const isCooling =
          domain === "climate" && hasHvacAction
            ? (state) => state.attributes.hvac_action === "cooling"
            : (state) => state.state === "cool";

        const hasHeat = states.states.some(isHeating);
        const hasCool = states.states.some(isCooling);
        // We differentiate between thermostats that have a target temperature
        // range versus ones that have just a target temperature

        // Using step chart by step-before so manually interpolation not needed.
        const hasTargetRange = states.states.some(
          (state) =>
            state.attributes &&
            state.attributes.target_temp_high !==
              state.attributes.target_temp_low
        );

        addColumn(
          `${this.hass.localize(
            "ui.card.climate.current_temperature",
            "name",
            name
          )}`,
          true
        );
        if (hasHeat) {
          addColumn(
            `${this.hass.localize("ui.card.climate.heating", "name", name)}`,
            true,
            true
          );
          // The "heating" series uses steppedArea to shade the area below the current
          // temperature when the thermostat is calling for heat.
        }
        if (hasCool) {
          addColumn(
            `${this.hass.localize("ui.card.climate.cooling", "name", name)}`,
            true,
            true
          );
          // The "cooling" series uses steppedArea to shade the area below the current
          // temperature when the thermostat is calling for heat.
        }

        if (hasTargetRange) {
          addColumn(
            `${this.hass.localize(
              "ui.card.climate.target_temperature_mode",
              "name",
              name,
              "mode",
              this.hass.localize("ui.card.climate.high")
            )}`,
            true
          );
          addColumn(
            `${this.hass.localize(
              "ui.card.climate.target_temperature_mode",
              "name",
              name,
              "mode",
              this.hass.localize("ui.card.climate.low")
            )}`,
            true
          );
        } else {
          addColumn(
            `${this.hass.localize(
              "ui.card.climate.target_temperature_entity",
              "name",
              name
            )}`,
            true
          );
        }

        states.states.forEach((state) => {
          if (!state.attributes) return;
          const curTemp = safeParseFloat(state.attributes.current_temperature);
          const series = [curTemp];
          if (hasHeat) {
            series.push(isHeating(state) ? curTemp : null);
          }
          if (hasCool) {
            series.push(isCooling(state) ? curTemp : null);
          }
          if (hasTargetRange) {
            const targetHigh = safeParseFloat(
              state.attributes.target_temp_high
            );
            const targetLow = safeParseFloat(state.attributes.target_temp_low);
            series.push(targetHigh, targetLow);
            pushData(new Date(state.last_changed), series);
          } else {
            const target = safeParseFloat(state.attributes.temperature);
            series.push(target);
            pushData(new Date(state.last_changed), series);
          }
        });
      } else {
        // Only disable interpolation for sensors
        const isStep = domain === "sensor";
        addColumn(name, isStep);

        let lastValue = null;
        let lastDate = null;
        let lastNullDate = null;

        // Process chart data.
        // When state is `unknown`, calculate the value and break the line.
        states.states.forEach((state) => {
          const value = safeParseFloat(state.state);
          const date = new Date(state.last_changed);
          if (value !== null && lastNullDate !== null) {
            const dateTime = date.getTime();
            const lastNullDateTime = lastNullDate.getTime();
            const lastDateTime = lastDate.getTime();
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
            lastValue !== null
          ) {
            lastNullDate = date;
          }
        });
      }

      // Add an entry for final values
      pushData(endTime, prevValues, false);

      // Concat two arrays
      Array.prototype.push.apply(datasets, data);
    });

    const formatTooltipTitle = (items, data) => {
      const item = items[0];
      const date = data.datasets[item.datasetIndex].data[item.index].x;

      return formatDateTimeWithSeconds(date, this.hass.language);
    };

    const chartOptions = {
      type: "line",
      unit: unit,
      legend: !this.isSingleDevice,
      options: {
        scales: {
          xAxes: [
            {
              type: "time",
              ticks: {
                major: {
                  fontStyle: "bold",
                },
              },
            },
          ],
          yAxes: [
            {
              ticks: {
                maxTicksLimit: 7,
              },
            },
          ],
        },
        tooltips: {
          mode: "neareach",
          callbacks: {
            title: formatTooltipTitle,
          },
        },
        hover: {
          mode: "neareach",
        },
        layout: {
          padding: {
            top: 5,
          },
        },
        elements: {
          line: {
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          point: {
            hitRadius: 5,
          },
        },
        plugins: {
          filler: {
            propagate: true,
          },
        },
      },
      data: {
        labels: [],
        datasets: datasets,
      },
    };
    this.chartData = chartOptions;
  }
}
customElements.define("state-history-chart-line", StateHistoryChartLine);
