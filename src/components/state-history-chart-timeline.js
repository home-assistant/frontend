import "@polymer/polymer/lib/utils/debounce";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { formatDateTimeWithSeconds } from "../common/datetime/format_date_time";
import { computeDomain } from "../common/entity/compute_domain";
import { computeRTL } from "../common/util/compute_rtl";
import LocalizeMixin from "../mixins/localize-mixin";
import "./entity/ha-chart-base";

/** Binary sensor device classes for which the static colors for on/off need to be inverted.
 *  List the ones were "off" = good or normal state = should be rendered "green".
 */
const BINARY_SENSOR_DEVICE_CLASS_COLOR_INVERTED = new Set([
  "battery",
  "door",
  "garage_door",
  "gas",
  "lock",
  "opening",
  "problem",
  "safety",
  "smoke",
  "window",
]);

class StateHistoryChartTimeline extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }
        :host([rendered]) {
          opacity: 1;
        }

        ha-chart-base {
          direction: ltr;
        }
      </style>
      <ha-chart-base
        hass="[[hass]]"
        data="[[chartData]]"
        rendered="{{rendered}}"
        rtl="{{rtl}}"
      ></ha-chart-base>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      chartData: Object,
      data: {
        type: Object,
        observer: "dataChanged",
      },
      names: Object,
      noSingle: Boolean,
      endTime: Date,
      rendered: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
      },
      rtl: {
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  static get observers() {
    return ["dataChanged(data, endTime, localize, language)"];
  }

  connectedCallback() {
    super.connectedCallback();
    this._isAttached = true;
    this.drawChart();
  }

  dataChanged() {
    this.drawChart();
  }

  drawChart() {
    const staticColors = {
      on: 1,
      off: 0,
      home: 1,
      not_home: 0,
      unavailable: "#a0a0a0",
      unknown: "#606060",
      idle: 2,
    };
    let stateHistory = this.data;

    if (!this._isAttached) {
      return;
    }

    if (!stateHistory) {
      stateHistory = [];
    }

    const startTime = new Date(
      stateHistory.reduce(
        (minTime, stateInfo) =>
          Math.min(minTime, new Date(stateInfo.data[0].last_changed)),
        new Date()
      )
    );

    // end time is Math.max(startTime, last_event)
    let endTime =
      this.endTime ||
      new Date(
        stateHistory.reduce(
          (maxTime, stateInfo) =>
            Math.max(
              maxTime,
              new Date(stateInfo.data[stateInfo.data.length - 1].last_changed)
            ),
          startTime
        )
      );

    if (endTime > new Date()) {
      endTime = new Date();
    }

    const labels = [];
    const datasets = [];
    // stateHistory is a list of lists of sorted state objects
    const names = this.names || {};
    stateHistory.forEach((stateInfo) => {
      let newLastChanged;
      let prevState = null;
      let locState = null;
      let prevLastChanged = startTime;
      const entityDisplay = names[stateInfo.entity_id] || stateInfo.name;

      const invertOnOff =
        computeDomain(stateInfo.entity_id) === "binary_sensor" &&
        BINARY_SENSOR_DEVICE_CLASS_COLOR_INVERTED.has(
          this.hass.states[stateInfo.entity_id].attributes.device_class
        );

      const dataRow = [];
      stateInfo.data.forEach((state) => {
        let newState = state.state;
        const timeStamp = new Date(state.last_changed);
        if (newState === undefined || newState === "") {
          newState = null;
        }
        if (timeStamp > endTime) {
          // Drop datapoints that are after the requested endTime. This could happen if
          // endTime is 'now' and client time is not in sync with server time.
          return;
        }
        if (prevState !== null && newState !== prevState) {
          newLastChanged = new Date(state.last_changed);

          dataRow.push([
            prevLastChanged,
            newLastChanged,
            locState,
            prevState,
            invertOnOff,
          ]);

          prevState = newState;
          locState = state.state_localize;
          prevLastChanged = newLastChanged;
        } else if (prevState === null) {
          prevState = newState;
          locState = state.state_localize;
          prevLastChanged = new Date(state.last_changed);
        }
      });

      if (prevState !== null) {
        dataRow.push([
          prevLastChanged,
          endTime,
          locState,
          prevState,
          invertOnOff,
        ]);
      }
      datasets.push({ data: dataRow, entity_id: stateInfo.entity_id });
      labels.push(entityDisplay);
    });

    const formatTooltipLabel = (item, data) => {
      const values = data.datasets[item.datasetIndex].data[item.index];

      const start = formatDateTimeWithSeconds(values[0], this.hass.language);
      const end = formatDateTimeWithSeconds(values[1], this.hass.language);
      const state = values[2];

      return [state, start, end];
    };

    const formatTooltipBeforeBody = (item, data) => {
      if (!this.hass.userData || !this.hass.userData.showAdvanced || !item[0]) {
        return "";
      }
      // Extract the entity ID from the dataset.
      const values = data.datasets[item[0].datasetIndex];
      return values.entity_id || "";
    };

    const chartOptions = {
      type: "timeline",
      options: {
        tooltips: {
          callbacks: {
            label: formatTooltipLabel,
            beforeBody: formatTooltipBeforeBody,
          },
        },
        scales: {
          xAxes: [
            {
              ticks: {
                major: {
                  fontStyle: "bold",
                },
              },
            },
          ],
          yAxes: [
            {
              afterSetDimensions: (yaxe) => {
                yaxe.maxWidth = yaxe.chart.width * 0.18;
              },
              position: this._computeRTL ? "right" : "left",
            },
          ],
        },
      },
      data: {
        labels: labels,
        datasets: datasets,
      },
      colors: {
        staticColors: staticColors,
        staticColorIndex: 3,
      },
    };
    this.chartData = chartOptions;
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}
customElements.define(
  "state-history-chart-timeline",
  StateHistoryChartTimeline
);
