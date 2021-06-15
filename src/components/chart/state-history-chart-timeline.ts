import { ChartData, ChartDataset, ChartOptions } from "chart.js";
import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { getColorByIndex } from "../../common/color/colors";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeRTL } from "../../common/util/compute_rtl";
import { TimelineEntity } from "../../data/history";
import { HomeAssistant } from "../../types";
import { TimelineController, TimeLineData } from "./chart-type-timeline";
import "./ha-chart-base";

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

const STATIC_COLORS = {
  on: "#66a61e",
  off: "#ff0029",
  home: "#66a61e",
  not_home: "#ff0029",
  unavailable: "#a0a0a0",
  unknown: "#606060",
  idle: "#377eb8",
};

const stateColorMap: Map<string, string> = new Map();

let colorIndex = 0;

const invertOnOff = (entityState?: HassEntity) =>
  entityState &&
  computeDomain(entityState.entity_id) === "binary_sensor" &&
  "device_class" in entityState.attributes &&
  BINARY_SENSOR_DEVICE_CLASS_COLOR_INVERTED.has(
    entityState.attributes.device_class!
  );

const getColor = (stateString: string, entityState?: HassEntity) => {
  if (invertOnOff(entityState)) {
    stateString = stateString === "on" ? "off" : "on";
  }
  if (stateColorMap.has(stateString)) {
    return stateColorMap.get(stateString);
  }
  if (stateString in STATIC_COLORS) {
    const color = STATIC_COLORS[stateString];
    stateColorMap.set(stateString, color);
    return color;
  }
  const color = getColorByIndex(colorIndex);
  colorIndex++;
  stateColorMap.set(stateString, color);
  return color;
};

@customElement("state-history-chart-timeline")
export class StateHistoryChartTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: TimelineEntity[] = [];

  @property({ type: Boolean }) public names = false;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ type: Boolean }) public isSingleDevice = false;

  @property({ attribute: false }) public endTime?: Date;

  @state() private _chartData?: ChartData<"timeline">;

  @state() private _chartOptions?: ChartOptions<"timeline">;

  protected render() {
    return html`
      <ha-chart-base
        .data=${this._chartData}
        .options=${this._chartOptions}
        chartType="timeline"
      ></ha-chart-base>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._chartOptions = {
        ...TimelineController.defaults,
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        scales: {
          x: {
            type: "timeline",
            position: "bottom",
            adapters: {
              date: {
                locale: this.hass.locale,
              },
            },
            ticks: {
              autoSkip: true,
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
            grid: {
              offset: false,
            },
            time: {
              tooltipFormat: "datetimeseconds",
            },
          },
          y: {
            type: "category",
            barThickness: 20,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
            offset: true,
            grid: {
              display: false,
              drawBorder: false,
              drawTicks: false,
            },
            ticks: {
              display: this.data.length !== 1,
            },
            afterSetDimensions: (y) => {
              y.maxWidth = y.chart.width * 0.18;
            },
            position: computeRTL(this.hass) ? "right" : "left",
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "nearest",
            callbacks: {
              title: (context) =>
                context![0].chart!.data!.labels![
                  context[0].datasetIndex
                ] as string,
              label: (item) => {
                const d = item.dataset.data[item.dataIndex] as TimeLineData;
                return [
                  d.label || "",
                  formatDateTimeWithSeconds(d.start, this.hass.locale),
                  formatDateTimeWithSeconds(d.end, this.hass.locale),
                ];
              },
            },
          },
          filler: {
            propagate: true,
          },
        },
      };
    }
    if (changedProps.has("data")) {
      this._generateData();
    }
  }

  private _generateData() {
    let stateHistory = this.data;

    if (!stateHistory) {
      stateHistory = [];
    }

    const startTime = new Date(
      stateHistory.reduce(
        (minTime, stateInfo) =>
          Math.min(minTime, new Date(stateInfo.data[0].last_changed).getTime()),
        new Date().getTime()
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
              new Date(
                stateInfo.data[stateInfo.data.length - 1].last_changed
              ).getTime()
            ),
          startTime.getTime()
        )
      );

    if (endTime > new Date()) {
      endTime = new Date();
    }

    const labels: string[] = [];
    const datasets: ChartDataset<"timeline">[] = [];
    // stateHistory is a list of lists of sorted state objects
    const names = this.names || {};
    stateHistory.forEach((stateInfo) => {
      let newLastChanged: Date;
      let prevState: string | null = null;
      let locState: string | null = null;
      let prevLastChanged = startTime;
      const entityDisplay: string =
        names[stateInfo.entity_id] || stateInfo.name;

      const dataRow: TimeLineData[] = [];
      stateInfo.data.forEach((entityState) => {
        let newState: string | null = entityState.state;
        const timeStamp = new Date(entityState.last_changed);
        if (newState === undefined || newState === "") {
          newState = null;
        }
        if (timeStamp > endTime) {
          // Drop datapoints that are after the requested endTime. This could happen if
          // endTime is 'now' and client time is not in sync with server time.
          return;
        }
        if (prevState === null) {
          prevState = newState;
          locState = entityState.state_localize;
          prevLastChanged = new Date(entityState.last_changed);
        } else if (newState !== prevState) {
          newLastChanged = new Date(entityState.last_changed);

          dataRow.push({
            start: prevLastChanged,
            end: newLastChanged,
            label: locState,
            color: getColor(prevState, this.hass.states[stateInfo.entity_id]),
          });

          prevState = newState;
          locState = entityState.state_localize;
          prevLastChanged = newLastChanged;
        }
      });

      if (prevState !== null) {
        dataRow.push({
          start: prevLastChanged,
          end: endTime,
          label: locState,
          color: getColor(prevState, this.hass.states[stateInfo.entity_id]),
        });
      }
      datasets.push({
        data: dataRow,
        label: stateInfo.entity_id,
      });
      labels.push(entityDisplay);
    });

    this._chartData = {
      labels: labels,
      datasets: datasets,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-chart-timeline": StateHistoryChartTimeline;
  }
}
