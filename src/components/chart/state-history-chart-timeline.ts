import type { ChartData, ChartDataset } from "chart.js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import millisecondsToDuration from "../../common/datetime/milliseconds_to_duration";
import { computeRTL } from "../../common/util/compute_rtl";
import type { TimelineEntity } from "../../data/history";
import type { HomeAssistant } from "../../types";
import type { ChartResizeOptions, HaChartBase } from "./ha-chart-base";
import { MIN_TIME_BETWEEN_UPDATES } from "./ha-chart-base";
import type { TimeLineData } from "./timeline-chart/const";
import { computeTimelineColor } from "./timeline-chart/timeline-color";
import type { ECOption } from "../../resources/echarts";
import echarts from "../../resources/echarts";
import { formatDateVeryShort } from "../../common/datetime/format_date";
import { formatTime } from "../../common/datetime/format_time";

@customElement("state-history-chart-timeline")
export class StateHistoryChartTimeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: TimelineEntity[] = [];

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public names?: Record<string, string>;

  @property() public unit?: string;

  @property() public identifier?: string;

  @property({ attribute: "show-names", type: Boolean }) public showNames = true;

  @property({ attribute: "click-for-more-info", type: Boolean })
  public clickForMoreInfo = true;

  @property({ type: Boolean }) public chunked = false;

  @property({ attribute: false }) public startTime!: Date;

  @property({ attribute: false }) public endTime!: Date;

  @property({ attribute: false, type: Number }) public paddingYAxis = 0;

  @property({ attribute: false, type: Number }) public chartIndex?;

  @state() private _chartData?: ChartData<"timeline">;

  @state() private _chartOptions?: ECOption;

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
        .height=${this.data.length * 25 + 40}
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
      changedProps.has("showNames") ||
      changedProps.has("_chartData")
    ) {
      this._createOptions();
    }
  }

  private _createOptions() {
    const narrow = this.narrow;
    const labelWidth = narrow ? 105 : 185;
    const labelPadding = this.chunked || this.showNames ? labelWidth - 20 : 10;
    const rtl = computeRTL(this.hass);
    this._chartOptions = {
      xAxis: {
        type: "time",
        min: this.startTime,
        max: this.endTime,
        splitLine: {
          show: true,
        },
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            // show only date for the beginning of the day
            if (
              date.getHours() === 0 &&
              date.getMinutes() === 0 &&
              date.getSeconds() === 0
            ) {
              return `{day|${formatDateVeryShort(date, this.hass.locale, this.hass.config)}}`;
            }
            return formatTime(date, this.hass.locale, this.hass.config);
          },
          rich: {
            day: {
              fontWeight: "bold",
            },
          },
        },
      },
      yAxis: {
        type: "category",
        data: (this._chartData?.labels ?? []) as string[],
        position: rtl ? "right" : "left",
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: this.chunked || this.showNames,
          width: labelWidth,
          overflow: "truncate",
        },
      },
      grid: {
        top: 10,
        bottom: 30,
        left: rtl ? 10 : labelPadding,
        right: rtl ? labelPadding : 10,
      },
      series: this._chartData?.datasets.map((dataset, datasetIndex) => ({
        data: dataset.data.map((data) => ({
          value: [
            datasetIndex,
            data.start.getTime(),
            data.end.getTime(),
            data.label,
          ],
          itemStyle: {
            color: data.color,
          },
          name: data.label,
        })),
        type: "custom",
        encode: {
          x: [1, 2],
          y: 0,
        },
        name: this._chartData?.labels?.[datasetIndex] ?? "",
        renderItem: (params, api) => {
          const categoryIndex = api.value(0);
          const start = api.coord([api.value(1), categoryIndex]);
          const end = api.coord([api.value(2), categoryIndex]);
          const height = api.size!([0, 1])[1] * 0.8;
          const rectShape = echarts.graphic.clipRectByRect(
            {
              x: start[0],
              y: start[1] - height / 2,
              width: end[0] - start[0],
              height: height,
            },
            {
              x: params.coordSys.x,
              y: params.coordSys.y,
              width: params.coordSys.width,
              height: params.coordSys.height,
            }
          );
          return (
            rectShape && {
              type: "rect",
              transition: ["shape"],
              shape: rectShape,
              style: api.style(),
            }
          );
        },
      })),
      tooltip: {
        appendTo: document.body,
        formatter: (params) => {
          const durationInMs = params.value[2] - params.value[1];
          const formattedDuration = `${this.hass.localize(
            "ui.components.history_charts.duration"
          )}: ${millisecondsToDuration(durationInMs)}`;

          return [
            params.marker + params.name,
            formatDateTimeWithSeconds(
              new Date(params.value[1]),
              this.hass.locale,
              this.hass.config
            ),
            formatDateTimeWithSeconds(
              new Date(params.value[2]),
              this.hass.locale,
              this.hass.config
            ),
            formattedDuration,
          ].join("<br>");
        },
      },
      // maintainAspectRatio: false,
      // parsing: false,
      // scales: {
      //   x: {
      //     type: "time",
      //     position: "bottom",
      //     adapters: {
      //       date: {
      //         locale: this.hass.locale,
      //         config: this.hass.config,
      //       },
      //     },
      //     min: this.startTime,
      //     suggestedMax: this.endTime,
      //     ticks: {
      //       autoSkip: true,
      //       maxRotation: 0,
      //       sampleSize: 5,
      //       autoSkipPadding: 20,
      //       major: {
      //         enabled: true,
      //       },
      //       font: (context) =>
      //         context.tick && context.tick.major
      //           ? ({ weight: "bold" } as any)
      //           : {},
      //     },
      //     grid: {
      //       offset: false,
      //     },
      //     time: {
      //       tooltipFormat: "datetimeseconds",
      //     },
      //   },
      //   y: {
      //     type: "category",
      //     barThickness: 20,
      //     offset: true,
      //     grid: {
      //       display: false,
      //       drawBorder: false,
      //       drawTicks: false,
      //     },
      //     ticks: {
      //       display: this.chunked || this.showNames,
      //     },
      //     afterSetDimensions: (y) => {
      //       y.maxWidth = y.chart.width * 0.18;
      //     },
      //     afterFit: (scaleInstance) => {
      //       if (this.chunked) {
      //         // ensure all the chart labels are the same width
      //         scaleInstance.width = narrow ? 105 : 185;
      //       }
      //     },
      //     afterUpdate: (y) => {
      //       const yWidth = this.showNames
      //         ? (y.width ?? 0)
      //         : computeRTL(this.hass)
      //           ? 0
      //           : (y.left ?? 0);
      //       if (
      //         this._yWidth !== Math.floor(yWidth) &&
      //         y.ticks.length === this.data.length
      //       ) {
      //         this._yWidth = Math.floor(yWidth);
      //         fireEvent(this, "y-width-changed", {
      //           value: this._yWidth,
      //           chartIndex: this.chartIndex,
      //         });
      //       }
      //     },
      //     position: computeRTL(this.hass) ? "right" : "left",
      //   },
      // },
      // plugins: {
      //   tooltip: {
      //     mode: "nearest",
      //     callbacks: {
      //       title: (context) =>
      //         context![0].chart!.data!.labels![
      //           context[0].datasetIndex
      //         ] as string,
      //       beforeBody: (context) => context[0].dataset.label || "",
      //       label: (item) => {
      //         const d = item.dataset.data[item.dataIndex] as TimeLineData;
      //         const durationInMs = d.end.getTime() - d.start.getTime();
      //         const formattedDuration = `${this.hass.localize(
      //           "ui.components.history_charts.duration"
      //         )}: ${millisecondsToDuration(durationInMs)}`;

      //         return [
      //           d.label || "",
      //           formatDateTimeWithSeconds(
      //             d.start,
      //             this.hass.locale,
      //             this.hass.config
      //           ),
      //           formatDateTimeWithSeconds(
      //             d.end,
      //             this.hass.locale,
      //             this.hass.config
      //           ),
      //           formattedDuration,
      //         ];
      //       },
      //       labelColor: (item) => ({
      //         borderColor: (item.dataset.data[item.dataIndex] as TimeLineData)
      //           .color!,
      //         backgroundColor: (
      //           item.dataset.data[item.dataIndex] as TimeLineData
      //         ).color!,
      //       }),
      //     },
      //   },
      //   filler: {
      //     propagate: true,
      //   },
      // },
      // // @ts-expect-error
      // locale: numberFormatToLocale(this.hass.locale),
      // onClick: (e: any) => {
      //   if (!this.clickForMoreInfo || clickIsTouch(e)) {
      //     return;
      //   }

      //   const chart = e.chart;
      //   const canvasPosition = getRelativePosition(e, chart);

      //   const index = Math.abs(
      //     chart.scales.y.getValueForPixel(canvasPosition.y)
      //   );
      //   fireEvent(this, "hass-more-info", {
      //     // @ts-ignore
      //     entityId: this._chartData?.datasets[index]?.label,
      //   });
      //   chart.canvas.dispatchEvent(new Event("mouseout")); // to hide tooltip
      // },
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
