import type { ChartData, ChartDataset, ChartOptions } from "chart.js";
import { getRelativePosition } from "chart.js/helpers";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import millisecondsToDuration from "../../common/datetime/milliseconds_to_duration";
import { fireEvent } from "../../common/dom/fire_event";
import { numberFormatToLocale } from "../../common/number/format_number";
import { computeRTL } from "../../common/util/compute_rtl";
import { TimelineEntity } from "../../data/history";
import { HomeAssistant } from "../../types";
import {
  ChartResizeOptions,
  HaChartBase,
  MIN_TIME_BETWEEN_UPDATES,
} from "./ha-chart-base";
import type { TimeLineData } from "./timeline-chart/const";
import { computeTimelineColor } from "./timeline-chart/timeline-color";

@customElement("state-history-chart-timeline")
export class StateHistoryChartTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: TimelineEntity[] = [];

  @property() public narrow!: boolean;

  @property() public names?: Record<string, string>;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ type: Boolean }) public showNames = true;

  @property({ type: Boolean }) public clickForMoreInfo = true;

  @property({ type: Boolean }) public chunked = false;

  @property({ attribute: false }) public startTime!: Date;

  @property({ attribute: false }) public endTime!: Date;

  @property({ type: Number }) public paddingYAxis = 0;

  @property({ type: Number }) public chartIndex?;

  @state() private _chartData?: ChartData<"timeline">;

  @state() private _chartOptions?: ChartOptions<"timeline">;

  @state() private _yWidth = 0;

  private _chartTime: Date = new Date();

  @query("ha-chart-base") private _chart?: HaChartBase;

  public resize = (options?: ChartResizeOptions): void => {
    this._chart?.resize(options);
  };

  protected render() {
    return html`
      <ha-chart-base
        .hass=${this.hass}
        .data=${this._chartData}
        .options=${this._chartOptions}
        .height=${this.data.length * 30 + 30}
        .paddingYAxis=${this.paddingYAxis - this._yWidth}
        chart-type="timeline"
      ></ha-chart-base>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._createOptions();
    }

    if (
      changedProps.has("startTime") ||
      changedProps.has("endTime") ||
      changedProps.has("data") ||
      this._chartTime <
        new Date(this.endTime.getTime() - MIN_TIME_BETWEEN_UPDATES)
    ) {
      // If the line is more than 5 minutes old, re-gen it
      // so the X axis grows even if there is no new data
      this._generateData();
    }

    if (
      changedProps.has("startTime") ||
      changedProps.has("endTime") ||
      changedProps.has("showNames")
    ) {
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
              config: this.hass.config,
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
            display: this.chunked || this.showNames,
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
          afterUpdate: (y) => {
            const yWidth = this.showNames
              ? y.width ?? 0
              : computeRTL(this.hass)
              ? 0
              : y.left ?? 0;
            if (
              this._yWidth !== Math.floor(yWidth) &&
              y.ticks.length === this.data.length
            ) {
              this._yWidth = Math.floor(yWidth);
              fireEvent(this, "y-width-changed", {
                value: this._yWidth,
                chartIndex: this.chartIndex,
              });
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
              const durationInMs = d.end.getTime() - d.start.getTime();
              const formattedDuration = `${this.hass.localize(
                "ui.components.history_charts.duration"
              )}: ${millisecondsToDuration(durationInMs)}`;

              return [
                d.label || "",
                formatDateTimeWithSeconds(
                  d.start,
                  this.hass.locale,
                  this.hass.config
                ),
                formatDateTimeWithSeconds(
                  d.end,
                  this.hass.locale,
                  this.hass.config
                ),
                formattedDuration,
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
      onClick: (e: any) => {
        if (!this.clickForMoreInfo) {
          return;
        }

        const chart = e.chart;
        const canvasPosition = getRelativePosition(e, chart);

        const index = Math.abs(
          chart.scales.y.getValueForPixel(canvasPosition.y)
        );
        fireEvent(this, "hass-more-info", {
          // @ts-ignore
          entityId: this._chartData?.datasets[index]?.label,
        });
        chart.canvas.dispatchEvent(new Event("mouseout")); // to hide tooltip
      },
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
            color: computeTimelineColor(
              prevState,
              computedStyles,
              this.hass.states[stateInfo.entity_id]
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
          color: computeTimelineColor(
            prevState,
            computedStyles,
            this.hass.states[stateInfo.entity_id]
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
