import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  computeHistory,
  subscribeHistoryStatesTimeWindow,
} from "../../../data/history";
import type {
  HistoryResult,
  LineChartUnit,
  TimelineEntity,
} from "../../../data/history";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import type {
  LovelaceCardFeatureContext,
  SensorGraphLineCardFeatureConfig,
} from "./types";
import { getSensorNumericDeviceClasses } from "../../../data/sensor";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { getGraphColorByIndex } from "../../../common/color/colors";
import { computeTimelineColor } from "../../../components/chart/timeline-color";
import { downSampleLineData } from "../../../components/chart/down-sample";
import { fireEvent } from "../../../common/dom/fire_event";

export const supportsSensorGraphLineCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return ["sensor", "binary_sensor"].includes(domain);
};

@customElement("hui-sensor-graph-line-card-feature")
class HuiSensorGraphLineCardFeature
  extends SubscribeMixin(LitElement)
  implements LovelaceCardFeature
{
  @property({ attribute: false, hasChanged: () => false })
  public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: SensorGraphLineCardFeatureConfig;

  @state() private _stateHistory?: HistoryResult;

  private _interval?: number;

  static getStubConfig(): SensorGraphLineCardFeatureConfig {
    return {
      type: "sensor-graph-line",
      hours_to_show: 24,
    };
  }

  public setConfig(config: SensorGraphLineCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    this._interval = window.setInterval(() => this.requestUpdate(), 1000 * 60);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._interval);
  }

  protected hassSubscribe() {
    return [this._subscribeHistory()];
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateHistory ||
      !supportsSensorGraphLineCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const line = this._stateHistory.line[0];
    const timeline = this._stateHistory.timeline[0];
    const width = this.clientWidth;
    const height = this.clientHeight;
    if (line) {
      const points = this._generateLinePoints(line);
      const { paths, filledPaths } = this._getLinePaths(points);
      const color = getGraphColorByIndex(0, this.style);

      return html`
        <div class="line" @click=${this._handleClick}>
          ${svg`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            ${paths.map(
              (path) =>
                svg`<path d="${path}" stroke="${color}" stroke-width="1" stroke-linecap="round" fill="none" />`
            )}
            ${filledPaths.map(
              (path) =>
                svg`<path d="${path}" stroke="none" stroke-linecap="round" fill="${color}" fill-opacity="0.2" />`
            )}
              </svg>`}
        </div>
      `;
    }
    if (timeline) {
      const ranges = this._generateTimelineRanges(timeline);
      return html`
        <div class="timeline" @click=${this._handleClick}>
          ${svg`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <g>
                ${ranges.map((r) => svg`<rect x="${r.startX}" y="0" width="${r.endX - r.startX}" height="${height}" fill="${r.color}" />`)}
            </g>
            </svg>`}
        </div>
      `;
    }
    return nothing;
  }

  private _handleClick() {
    // open more info dialog to show more detailed history
    fireEvent(this, "hass-more-info", { entityId: this.context!.entity_id! });
  }

  private async _subscribeHistory(): Promise<() => Promise<void>> {
    if (
      !isComponentLoaded(this.hass!, "history") ||
      !this.context?.entity_id ||
      !this._config
    ) {
      return () => Promise.resolve();
    }

    const { numeric_device_classes: sensorNumericDeviceClasses } =
      await getSensorNumericDeviceClasses(this.hass!);

    return subscribeHistoryStatesTimeWindow(
      this.hass!,
      (historyStates) => {
        this._stateHistory = computeHistory(
          this.hass!,
          historyStates,
          [this.context!.entity_id!],
          this.hass!.localize,
          sensorNumericDeviceClasses,
          false
        );
      },
      this._config!.hours_to_show ?? 24,
      [this.context!.entity_id!]
    );
  }

  private _generateLinePoints(line: LineChartUnit): { x: number; y: number }[] {
    const width = this.clientWidth;
    const height = this.clientHeight;
    let minY = Number(line.data[0].states[0].state);
    let maxY = Number(line.data[0].states[0].state);
    const minX = line.data[0].states[0].last_changed;
    const maxX = Date.now();
    line.data[0].states.forEach((stateData) => {
      const stateValue = Number(stateData.state);
      if (stateValue < minY) {
        minY = stateValue;
      }
      if (stateValue > maxY) {
        maxY = stateValue;
      }
    });
    const rangeY = maxY - minY || minY * 0.1;
    const sampledData = downSampleLineData(
      line.data[0].states.map((stateData) => [
        stateData.last_changed,
        Number(stateData.state),
      ]),
      width,
      minX,
      maxX
    );
    // add margin to the min and max
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;
    const yDenom = maxY - minY || 1;
    const xDenom = maxX - minX || 1;
    const points = sampledData!.map((point) => {
      const x = ((point![0] - minX) / xDenom) * width;
      const y = height - ((Number(point![1]) - minY) / yDenom) * height;
      return { x, y };
    });
    points.push({ x: width, y: points[points.length - 1].y });
    return points;
  }

  private _generateTimelineRanges(timeline: TimelineEntity) {
    if (timeline.data.length === 0) {
      return [];
    }
    const computedStyles = getComputedStyle(this);
    const width = this.clientWidth;
    const minX = timeline.data[0].last_changed;
    const maxX = Date.now();
    let prevEndX = 0;
    let prevStateColor = "";
    const ranges = timeline.data.map((t) => {
      const x = ((t.last_changed - minX) / (maxX - minX)) * width;
      const range = {
        startX: prevEndX,
        endX: x,
        color: prevStateColor,
      };
      prevStateColor = computeTimelineColor(
        t.state,
        computedStyles,
        this.hass!.states[timeline.entity_id]
      );
      prevEndX = x;
      return range;
    });
    ranges.push({
      startX: prevEndX,
      endX: width,
      color: prevStateColor,
    });
    return ranges;
  }

  private _getLinePaths(points: { x: number; y: number }[]) {
    const paths: string[] = [];
    const filledPaths: string[] = [];
    if (!points.length) {
      return { paths, filledPaths };
    }
    // path can interupted by missing data, so we need to split the path into segments
    const pathSegments: { x: number; y: number }[][] = [[]];
    points.forEach((point) => {
      if (!isNaN(point.y)) {
        pathSegments[pathSegments.length - 1].push(point);
      } else if (pathSegments[pathSegments.length - 1].length > 0) {
        pathSegments.push([]);
      }
    });

    pathSegments.forEach((pathPoints) => {
      // create a smoothed path
      let next: { x: number; y: number };
      let path = "";
      let last = pathPoints[0];

      path += `M ${last.x},${last.y}`;

      pathPoints.forEach((coord) => {
        next = coord;
        path += ` ${(next.x + last.x) / 2},${(next.y + last.y) / 2}`;
        path += ` Q${next.x},${next.y}`;
        last = next;
      });

      path += ` ${next!.x},${next!.y}`;
      paths.push(path);
      filledPaths.push(
        path +
          ` L ${next!.x},${this.clientHeight} L ${pathPoints[0].x},${this.clientHeight} Z`
      );
    });

    return { paths, filledPaths };
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: var(--feature-height);
    }
    :host > div {
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .timeline {
      border-radius: 4px;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sensor-graph-line-card-feature": HuiSensorGraphLineCardFeature;
  }
}
