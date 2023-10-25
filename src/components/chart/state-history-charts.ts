import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  queryAll,
  state,
} from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import {
  HistoryResult,
  LineChartUnit,
  TimelineEntity,
} from "../../data/history";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import "./state-history-chart-line";
import "./state-history-chart-timeline";
import type { StateHistoryChartLine } from "./state-history-chart-line";
import type { StateHistoryChartTimeline } from "./state-history-chart-timeline";
import { ChartResizeOptions } from "./ha-chart-base";

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

  @property({ attribute: false }) public historyData!: HistoryResult;

  @property() public narrow!: boolean;

  @property() public names?: Record<string, string>;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ attribute: false }) public endTime?: Date;

  @property({ attribute: false }) public startTime?: Date;

  @property({ type: Boolean, attribute: "up-to-now" }) public upToNow = false;

  @property() public hoursToShow?: number;

  @property({ type: Boolean }) public showNames = true;

  @property({ type: Boolean }) public clickForMoreInfo = true;

  @property({ type: Boolean }) public isLoadingData = false;

  private _computedStartTime!: Date;

  private _computedEndTime!: Date;

  @state() private _maxYWidth = 0;

  @state() private _childYWidths: number[] = [];

  @state() private _chartCount = 0;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  @queryAll("state-history-chart-line")
  private _charts?: StateHistoryChartLine[];

  public resize = (options?: ChartResizeOptions): void => {
    this._charts?.forEach(
      (chart: StateHistoryChartLine | StateHistoryChartTimeline) =>
        chart.resize(options)
    );
  };

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
    const combinedItems = this.historyData.timeline.length
      ? (this.virtualize
          ? chunkData(this.historyData.timeline, CANVAS_TIMELINE_ROWS_CHUNK)
          : [this.historyData.timeline]
        ).concat(this.historyData.line)
      : this.historyData.line;

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

  private _renderHistoryItem = (
    item: TimelineEntity[] | LineChartUnit,
    index: number
  ) => {
    if (!item || index === undefined) {
      return nothing;
    }
    if (!Array.isArray(item)) {
      return html`<div class="entry-container">
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
          @y-width-changed=${this._yWidthChanged}
        ></state-history-chart-line>
      </div> `;
    }
    return html`<div class="entry-container">
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
        this._computedStartTime = new Date(
          (this.historyData?.timeline ?? []).reduce(
            (minTime, stateInfo) =>
              Math.min(
                minTime,
                new Date(stateInfo.data[0].last_changed).getTime()
              ),
            new Date().getTime()
          )
        );
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
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

      .entry-container:hover {
        z-index: 1;
      }

      :host([virtualize]) .entry-container {
        padding-left: 1px;
        padding-right: 1px;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-charts": StateHistoryCharts;
  }
}
