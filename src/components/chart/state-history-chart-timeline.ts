import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  CustomSeriesOption,
  CustomSeriesRenderItem,
  ECElementEvent,
  TooltipFormatterCallback,
  TooltipPositionCallbackParams,
} from "echarts/types/dist/shared";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import millisecondsToDuration from "../../common/datetime/milliseconds_to_duration";
import { computeRTL } from "../../common/util/compute_rtl";
import type { TimelineEntity } from "../../data/history";
import type { HomeAssistant } from "../../types";
import { MIN_TIME_BETWEEN_UPDATES } from "./ha-chart-base";
import { computeTimelineColor } from "./timeline-color";
import type { ECOption } from "../../resources/echarts";
import echarts from "../../resources/echarts";
import { luminosity } from "../../common/color/rgb";
import { hex2rgb } from "../../common/color/convert-color";
import { measureTextWidth } from "../../util/text";
import { fireEvent } from "../../common/dom/fire_event";

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

  @state() private _chartData: CustomSeriesOption[] = [];

  @state() private _chartOptions?: ECOption;

  @state() private _yWidth = 0;

  private _chartTime: Date = new Date();

  protected render() {
    return html`
      <ha-chart-base
        .hass=${this.hass}
        .options=${this._chartOptions}
        .height=${`${this.data.length * 30 + 30}px`}
        .data=${this._chartData as ECOption["series"]}
        small-controls
        @chart-click=${this._handleChartClick}
      ></ha-chart-base>
    `;
  }

  private _renderItem: CustomSeriesRenderItem = (params, api) => {
    const categoryIndex = api.value(0);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);
    const height = 20;
    const coordSys = params.coordSys as any;
    const rectShape = echarts.graphic.clipRectByRect(
      {
        x: start[0],
        y: start[1] - height / 2,
        width: end[0] - start[0],
        height: height,
      },
      {
        x: coordSys.x,
        y: coordSys.y,
        width: coordSys.width,
        height: coordSys.height,
      }
    );
    if (!rectShape) return null;
    const rect = {
      type: "rect" as const,
      transition: "shape" as const,
      shape: rectShape,
      style: {
        fill: api.value(4) as string,
      },
    };
    const text = api.value(3) as string;
    const textWidth = measureTextWidth(text, 12);
    const LABEL_PADDING = 4;
    if (textWidth < rectShape.width - LABEL_PADDING * 2) {
      return {
        type: "group",
        children: [
          rect,
          {
            type: "text",
            style: {
              ...rectShape,
              x: rectShape.x + LABEL_PADDING,
              text,
              fill: api.value(5) as string,
              fontSize: 12,
              lineHeight: rectShape.height,
            },
          },
        ],
      };
    }
    return rect;
  };

  private _renderTooltip: TooltipFormatterCallback<TooltipPositionCallbackParams> =
    (params: TooltipPositionCallbackParams) => {
      const { value, name, marker, seriesName, color } = Array.isArray(params)
        ? params[0]
        : params;
      const title = seriesName
        ? `<h4 style="text-align: center; margin: 0;">${seriesName}</h4>`
        : "";
      const durationInMs = value![2] - value![1];
      const formattedDuration = `${this.hass.localize(
        "ui.components.history_charts.duration"
      )}: ${millisecondsToDuration(durationInMs)}`;

      const markerLocalized = !computeRTL(this.hass)
        ? marker
        : `<span style="direction: rtl;display:inline-block;margin-right:4px;margin-inline-end:4px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>`;

      const lines = [
        markerLocalized + name,
        formatDateTimeWithSeconds(
          new Date(value![1]),
          this.hass.locale,
          this.hass.config
        ),
        formatDateTimeWithSeconds(
          new Date(value![2]),
          this.hass.locale,
          this.hass.config
        ),
        formattedDuration,
      ].join("<br>");
      return [title, lines].join("");
    };

  public willUpdate(changedProps: PropertyValues) {
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
      !this.hasUpdated ||
      changedProps.has("startTime") ||
      changedProps.has("endTime") ||
      changedProps.has("showNames") ||
      changedProps.has("paddingYAxis") ||
      changedProps.has("_yWidth")
    ) {
      this._createOptions();
    }
  }

  private _createOptions() {
    const narrow = this.narrow;
    const showNames = this.chunked || this.showNames;
    const maxInternalLabelWidth = narrow ? 105 : 185;
    const labelWidth = showNames
      ? Math.max(this.paddingYAxis, this._yWidth)
      : 0;
    const labelMargin = 5;
    const rtl = computeRTL(this.hass);
    this._chartOptions = {
      xAxis: {
        type: "time",
        min: this.startTime,
        max: this.endTime,
        axisTick: {
          show: true,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        position: rtl ? "right" : "left",
        triggerEvent: true,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: showNames,
          width: labelWidth,
          overflow: "truncate",
          margin: labelMargin,
          formatter: (id: string) => {
            const label = this._chartData.find((d) => d.id === id)
              ?.name as string;
            const width = label
              ? Math.min(
                  measureTextWidth(label, 12) + labelMargin,
                  maxInternalLabelWidth
                )
              : 0;
            if (width > this._yWidth) {
              this._yWidth = width;
              fireEvent(this, "y-width-changed", {
                value: this._yWidth,
                chartIndex: this.chartIndex,
              });
            }
            return label;
          },
          hideOverlap: true,
        },
      },
      grid: {
        top: 10,
        bottom: 30,
        left: rtl ? 1 : labelWidth,
        right: rtl ? labelWidth : 1,
      },
      tooltip: {
        appendTo: document.body,
        formatter: this._renderTooltip,
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
    const datasets: CustomSeriesOption[] = [];
    const names = this.names || {};
    // stateHistory is a list of lists of sorted state objects
    stateHistory.forEach((stateInfo) => {
      let newLastChanged: Date;
      let prevState: string | null = null;
      let locState: string | null = null;
      let prevLastChanged = startTime;
      const entityDisplay: string = this.showNames
        ? names[stateInfo.entity_id] || stateInfo.name || stateInfo.entity_id
        : "";

      const dataRow: unknown[] = [];
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

          const color = computeTimelineColor(
            prevState,
            computedStyles,
            this.hass.states[stateInfo.entity_id]
          );
          dataRow.push({
            value: [
              stateInfo.entity_id,
              prevLastChanged,
              newLastChanged,
              locState,
              color,
              luminosity(hex2rgb(color)) > 0.5 ? "#000" : "#fff",
            ],
            itemStyle: {
              color,
            },
          });

          prevState = newState;
          locState = entityState.state_localize;
          prevLastChanged = newLastChanged;
        }
      });

      if (prevState !== null) {
        const color = computeTimelineColor(
          prevState,
          computedStyles,
          this.hass.states[stateInfo.entity_id]
        );
        dataRow.push({
          value: [
            stateInfo.entity_id,
            prevLastChanged,
            endTime,
            locState,
            color,
            luminosity(hex2rgb(color)) > 0.5 ? "#000" : "#fff",
          ],
          itemStyle: {
            color,
          },
        });
      }
      datasets.push({
        id: stateInfo.entity_id,
        data: dataRow,
        name: entityDisplay,
        dimensions: ["id", "start", "end", "name", "color", "textColor"],
        type: "custom",
        encode: {
          x: [1, 2],
          y: 0,
          itemName: 3,
        },
        renderItem: this._renderItem,
      });
    });

    this._chartData = datasets;
  }

  private _handleChartClick(e: CustomEvent<ECElementEvent>): void {
    if (e.detail.targetType === "axisLabel") {
      const dataset = this._chartData[e.detail.dataIndex];
      if (dataset) {
        fireEvent(this, "hass-more-info", {
          entityId: dataset.id as string,
        });
      }
    }
  }

  static styles = css`
    ha-chart-base {
      --chart-max-height: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-chart-timeline": StateHistoryChartTimeline;
  }
}
