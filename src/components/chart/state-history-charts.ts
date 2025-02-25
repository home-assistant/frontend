import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import type {
  HistoryResult,
  LineChartUnit,
  TimelineEntity,
} from "../../data/history";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import "./state-history-chart-line";
import "./state-history-chart-timeline";

const CANVAS_TIMELINE_ROWS_CHUNK = 10; // Split up the canvases to avoid hitting the render limit

const chunkData = (inputArray: any[], chunks: number) =>
  inputArray.reduce((results, item, idx) => {
    const chunkIdx = Math.floor(idx / chunks);
    if (!results[chunkIdx]) {
      results[chunkIdx] = [];
    }
    results[chunkIdx].push(item);
    return results;
  }, []);

declare global {
  interface HASSDomEvents {
    "y-width-changed": { value: number; chartIndex: number };
  }
}

@customElement("state-history-charts")
export class StateHistoryCharts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public historyData?: HistoryResult;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public names?: Record<string, string>;

  @property({ type: Boolean, reflect: true }) public virtualize = false;

  @property({ attribute: false }) public endTime?: Date;

  @property({ attribute: false }) public startTime?: Date;

  @property({ type: Boolean, attribute: "up-to-now" }) public upToNow = false;

  @property({ attribute: false, type: Number }) public hoursToShow?: number;

  @property({ attribute: "show-names", type: Boolean }) public showNames = true;

  @property({ attribute: "click-for-more-info", type: Boolean })
  public clickForMoreInfo = true;

  @property({ attribute: "is-loading-data", type: Boolean })
  public isLoadingData = false;

  @property({ attribute: "logarithmic-scale", type: Boolean })
  public logarithmicScale = false;

  @property({ attribute: false, type: Number }) public minYAxis?: number;

  @property({ attribute: false, type: Number }) public maxYAxis?: number;

  @property({ attribute: "fit-y-data", type: Boolean }) public fitYData = false;

  @property({ type: String }) public height?: string;

  @property({ attribute: "expand-legend", type: Boolean })
  public expandLegend?: boolean;

  private _computedStartTime!: Date;

  private _computedEndTime!: Date;

  @state() private _maxYWidth = 0;

  @state() private _childYWidths: number[] = [];

  @state() private _chartCount = 0;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  protected render() {
    if (!isComponentLoaded(this.hass, "history")) {
      return html`<div class="info">
        ${this.hass.localize("ui.components.history_charts.history_disabled")}
      </div>`;
    }

    if (this.isLoadingData && !this.historyData) {
      return html`<div class="info">
        ${this.hass.localize("ui.components.history_charts.loading_history")}
      </div>`;
    }

    if (this._isHistoryEmpty()) {
      return html`<div class="info">
        ${this.hass.localize("ui.components.history_charts.no_history_found")}
      </div>`;
    }
    const combinedItems = this.historyData!.timeline.length
      ? (this.virtualize
          ? chunkData(this.historyData!.timeline, CANVAS_TIMELINE_ROWS_CHUNK)
          : [this.historyData!.timeline]
        ).concat(this.historyData!.line)
      : this.historyData!.line;

    // eslint-disable-next-line lit/no-this-assign-in-render
    this._chartCount = combinedItems.length;

    return this.virtualize
      ? html`<div class="container ha-scrollbar" @scroll=${this._saveScrollPos}>
          <lit-virtualizer
            scroller
            class="ha-scrollbar"
            .items=${combinedItems}
            .renderItem=${this._renderHistoryItem}
          >
          </lit-virtualizer>
        </div>`
      : html`${combinedItems.map((item, index) =>
          this._renderHistoryItem(item, index)
        )}`;
  }

  private _renderHistoryItem: RenderItemFunction<
    TimelineEntity[] | LineChartUnit
  > = (item, index) => {
    if (!item || index === undefined) {
      // eslint-disable-next-line lit/prefer-nothing
      return html``;
    }
    if (!Array.isArray(item)) {
      return html`<div class="entry-container line">
        <state-history-chart-line
          .hass=${this.hass}
          .unit=${item.unit}
          .data=${item.data}
          .identifier=${item.identifier}
          .showNames=${this.showNames}
          .startTime=${this._computedStartTime}
          .endTime=${this._computedEndTime}
          .paddingYAxis=${this._maxYWidth}
          .names=${this.names}
          .chartIndex=${index}
          .clickForMoreInfo=${this.clickForMoreInfo}
          .logarithmicScale=${this.logarithmicScale}
          .minYAxis=${this.minYAxis}
          .maxYAxis=${this.maxYAxis}
          .fitYData=${this.fitYData}
          @y-width-changed=${this._yWidthChanged}
          .height=${this.virtualize ? undefined : this.height}
          .expandLegend=${this.expandLegend}
        ></state-history-chart-line>
      </div> `;
    }
    return html`<div class="entry-container timeline">
      <state-history-chart-timeline
        .hass=${this.hass}
        .data=${item}
        .startTime=${this._computedStartTime}
        .endTime=${this._computedEndTime}
        .showNames=${this.showNames}
        .names=${this.names}
        .narrow=${this.narrow}
        .chunked=${this.virtualize}
        .paddingYAxis=${this._maxYWidth}
        .chartIndex=${index}
        .clickForMoreInfo=${this.clickForMoreInfo}
        @y-width-changed=${this._yWidthChanged}
      ></state-history-chart-timeline>
    </div> `;
  };

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size === 1 && changedProps.has("hass")) {
      return false;
    }
    if (
      changedProps.size === 1 &&
      changedProps.has("_maxYWidth") &&
      changedProps.get("_maxYWidth") === this._maxYWidth
    ) {
      return false;
    }
    return true;
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }
    if (
      [...changedProps.keys()].some(
        (prop) =>
          !(
            ["_maxYWidth", "_childYWidths", "_chartCount"] as PropertyKey[]
          ).includes(prop)
      )
    ) {
      // Don't recompute times when we just want to update layout
      const now = new Date();

      this._computedEndTime =
        this.upToNow || !this.endTime || this.endTime > now
          ? now
          : this.endTime;

      if (this.startTime) {
        this._computedStartTime = this.startTime;
      } else if (this.hoursToShow) {
        this._computedStartTime = new Date(
          new Date().getTime() - 60 * 60 * this.hoursToShow * 1000
        );
      } else {
        let minTimeAll = (this.historyData?.timeline ?? []).reduce(
          (minTime, stateInfo) =>
            Math.min(
              minTime,
              new Date(stateInfo.data[0].last_changed).getTime()
            ),
          new Date().getTime()
        );

        minTimeAll = (this.historyData?.line ?? []).reduce(
          (minTimeLine, line) =>
            Math.min(
              minTimeLine,
              line.data.reduce(
                (minTimeData, data) =>
                  Math.min(
                    minTimeData,
                    new Date(data.states[0].last_changed).getTime()
                  ),
                minTimeLine
              )
            ),
          minTimeAll
        );

        this._computedStartTime = new Date(minTimeAll);
      }
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_chartCount")) {
      if (this._chartCount < this._childYWidths.length) {
        this._childYWidths.length = this._chartCount;
        this._maxYWidth = Math.max(...Object.values(this._childYWidths), 0);
      }
    }
  }

  private _yWidthChanged(e: CustomEvent<HASSDomEvents["y-width-changed"]>) {
    this._childYWidths[e.detail.chartIndex] = e.detail.value;
    this._maxYWidth = Math.max(...Object.values(this._childYWidths), 0);
  }

  private _isHistoryEmpty(): boolean {
    const historyDataEmpty =
      !this.historyData ||
      !this.historyData.timeline ||
      !this.historyData.line ||
      (this.historyData.timeline.length === 0 &&
        this.historyData.line.length === 0);
    return !this.isLoadingData && historyDataEmpty;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      /* height of single timeline chart = 60px */
      min-height: 60px;
    }

    :host([virtualize]) {
      height: 100%;
    }

    .info {
      text-align: center;
      line-height: 60px;
      color: var(--secondary-text-color);
    }

    .container {
      max-height: var(--history-max-height);
    }

    .entry-container {
      width: 100%;
    }

    .entry-container.line {
      flex: 1;
      padding-top: 8px;
      overflow: hidden;
    }

    .entry-container:hover {
      z-index: 1;
    }

    :host([virtualize]) .entry-container {
      padding-left: 1px;
      padding-right: 1px;
      padding-inline-start: 1px;
      padding-inline-end: 1px;
    }

    .entry-container.timeline:first-child {
      margin-top: var(--timeline-top-margin);
    }

    .entry-container:not(:first-child) {
      border-top: 2px solid var(--divider-color);
      margin-top: 16px;
    }

    .container,
    lit-virtualizer {
      height: 100%;
      width: 100%;
    }

    lit-virtualizer {
      contain: size layout !important;
    }

    state-history-chart-timeline,
    state-history-chart-line {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-charts": StateHistoryCharts;
  }
}
