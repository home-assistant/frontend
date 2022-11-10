import type { ChartData, ChartDataset, ChartOptions } from "chart.js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { getGraphColorByIndex } from "../../common/color/colors";
import { rgb2hex } from "../../common/color/convert-color";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import { stateActive } from "../../common/entity/state_active";
import { stateColor } from "../../common/entity/state_color";
import { numberFormatToLocale } from "../../common/number/format_number";
import { computeRTL } from "../../common/util/compute_rtl";
import { TimelineEntity } from "../../data/history";
import { HomeAssistant } from "../../types";
import { MIN_TIME_BETWEEN_UPDATES } from "./ha-chart-base";
import type { TimeLineData } from "./timeline-chart/const";

const stateColorTokenMap: Map<string, string> = new Map();
const stateColorMap: Map<string, string> = new Map();

let colorIndex = 0;

export const getStateColorToken = (
  stateString: string,
  entityState: HassEntity
) => {
  if (!stateActive(entityState, stateString)) {
    return `disabled`;
  }
  const color = stateColor(entityState, stateString);
  if (color) {
    return `state-${color}`;
  }
  return undefined;
};

const getColor = (
  stateString: string,
  entityState: HassEntity,
  computedStyles: CSSStyleDeclaration
) => {
  const stateColorToken = getStateColorToken(stateString, entityState);

  if (stateColorToken) {
    if (stateColorTokenMap.has(stateColorToken)) {
      return stateColorTokenMap.get(stateColorToken);
    }
    const value = computedStyles.getPropertyValue(
      `--rgb-${stateColorToken}-color`
    );

    if (value) {
      const parsedValue = value.split(",").map((v) => Number(v)) as [
        number,
        number,
        number
      ];
      const hexValue = rgb2hex(parsedValue);
      stateColorTokenMap.set(stateColorToken, hexValue);
      return hexValue;
    }
  }

  if (stateColorMap.has(stateString)) {
    return stateColorMap.get(stateString);
  }
  const color = getGraphColorByIndex(colorIndex, computedStyles);
  colorIndex++;
  stateColorMap.set(stateString, color);
  return color;
};

@customElement("state-history-chart-timeline")
export class StateHistoryChartTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: TimelineEntity[] = [];

  @property() public narrow!: boolean;

  @property() public names: boolean | Record<string, string> = false;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ type: Boolean }) public isSingleDevice = false;

  @property({ type: Boolean }) public chunked = false;

  @property({ attribute: false }) public startTime!: Date;

  @property({ attribute: false }) public endTime!: Date;

  @state() private _chartData?: ChartData<"timeline">;

  @state() private _chartOptions?: ChartOptions<"timeline">;

  private _chartTime: Date = new Date();

  protected render() {
    return html`
      <ha-chart-base
        .data=${this._chartData}
        .options=${this._chartOptions}
        .height=${this.data.length * 30 + 30}
        chart-type="timeline"
      ></ha-chart-base>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._createOptions();
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

    if (changedProps.has("startTime") || changedProps.has("endTime")) {
      this._createOptions();
    }
  }

  private _createOptions() {
    const narrow = this.narrow;
    this._chartOptions = {
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
          suggestedMin: this.startTime,
          suggestedMax: this.endTime,
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
          offset: true,
          grid: {
            display: false,
            drawBorder: false,
            drawTicks: false,
          },
          ticks: {
            display:
              this.chunked || !this.isSingleDevice || this.data.length !== 1,
          },
          afterSetDimensions: (y) => {
            y.maxWidth = y.chart.width * 0.18;
          },
          afterFit: (scaleInstance) => {
            if (this.chunked) {
              // ensure all the chart labels are the same width
              scaleInstance.width = narrow ? 105 : 185;
            }
          },
          position: computeRTL(this.hass) ? "right" : "left",
        },
      },
      plugins: {
        tooltip: {
          mode: "nearest",
          callbacks: {
            title: (context) =>
              context![0].chart!.data!.labels![
                context[0].datasetIndex
              ] as string,
            beforeBody: (context) => context[0].dataset.label || "",
            label: (item) => {
              const d = item.dataset.data[item.dataIndex] as TimeLineData;
              return [
                d.label || "",
                formatDateTimeWithSeconds(d.start, this.hass.locale),
                formatDateTimeWithSeconds(d.end, this.hass.locale),
              ];
            },
            labelColor: (item) => ({
              borderColor: (item.dataset.data[item.dataIndex] as TimeLineData)
                .color!,
              backgroundColor: (
                item.dataset.data[item.dataIndex] as TimeLineData
              ).color!,
            }),
          },
        },
        filler: {
          propagate: true,
        },
      },
      // @ts-expect-error
      locale: numberFormatToLocale(this.hass.locale),
    };
  }

  private _generateData() {
    const computedStyles = getComputedStyle(this);
    let stateHistory = this.data;

    if (!stateHistory) {
      stateHistory = [];
    }

    this._chartTime = new Date();
    const startTime = this.startTime;
    const endTime = this.endTime;
    const labels: string[] = [];
    const datasets: ChartDataset<"timeline">[] = [];
    const names = this.names || {};
    // stateHistory is a list of lists of sorted state objects
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
        if (!newState) {
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
            color: getColor(
              prevState,
              this.hass.states[stateInfo.entity_id],
              computedStyles
            ),
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
          color: getColor(
            prevState,
            this.hass.states[stateInfo.entity_id],
            computedStyles
          ),
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

  static get styles(): CSSResultGroup {
    return css`
      ha-chart-base {
        --chart-max-height: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-chart-timeline": StateHistoryChartTimeline;
  }
}
