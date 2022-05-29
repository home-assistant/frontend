import "@lit-labs/virtualizer";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, eventOptions } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import {
  HistoryResult,
  LineChartUnit,
  TimelineEntity,
} from "../../data/history";
import type { HomeAssistant } from "../../types";
import "./state-history-chart-line";
import "./state-history-chart-timeline";
import { restoreScroll } from "../../common/decorators/restore-scroll";

const CANVAS_TIMELINE_ROWS_CHUNK = 256; // Split up the canvases to avoid hitting the render limit

const chunkData = (inputArray: any[], chunks: number) =>
  inputArray.reduce((results, item, idx) => {
    const chunkIdx = Math.floor(idx / chunks);
    if (!results[chunkIdx]) {
      results[chunkIdx] = [];
    }
    results[chunkIdx].push(item);
    return results;
  }, []);

@customElement("state-history-charts")
class StateHistoryCharts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public historyData!: HistoryResult;

  @property() public narrow!: boolean;

  @property({ type: Boolean }) public names = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ attribute: false }) public endTime?: Date;

  @property({ type: Boolean, attribute: "up-to-now" }) public upToNow = false;

  @property({ type: Boolean, attribute: "no-single" }) public noSingle = false;

  @property({ type: Boolean }) public isLoadingData = false;

  @state() private _computedStartTime?: Date;

  @state() private _computedEndTime?: Date;

  @restoreScroll(".container") private _savedScrollPos?: number;

  @eventOptions({ passive: true })
  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass, "history")) {
      return html` <div class="info">
        ${this.hass.localize("ui.components.history_charts.history_disabled")}
      </div>`;
    }

    if (this.isLoadingData && !this.historyData) {
      return html` <div class="info">
        ${this.hass.localize("ui.components.history_charts.loading_history")}
      </div>`;
    }

    if (this._isHistoryEmpty()) {
      return html` <div class="info">
        ${this.hass.localize("ui.components.history_charts.no_history_found")}
      </div>`;
    }

    this._computedEndTime = this.upToNow
      ? new Date()
      : this.endTime || new Date();

    this._computedStartTime = new Date(
      this.historyData.timeline.reduce(
        (minTime, stateInfo) =>
          Math.min(minTime, new Date(stateInfo.data[0].last_changed).getTime()),
        new Date().getTime()
      )
    );

    const combinedItems = Array.prototype.concat.apply(
      [],
      [
        chunkData(this.historyData.timeline, CANVAS_TIMELINE_ROWS_CHUNK),
        this.historyData.line,
      ]
    );

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
  ): TemplateResult => {
    if (!item || index === undefined) {
      return html``;
    }
    if ("unit" in item) {
      return html`<div class="entry-container">
        <state-history-chart-line
          .hass=${this.hass}
          .unit=${item.unit}
          .data=${item.data}
          .identifier=${item.identifier}
          .isSingleDevice=${!this.noSingle &&
          this.historyData.timeline &&
          this.historyData.timeline.length === 1}
          .endTime=${this._computedEndTime}
          .names=${this.names}
        ></state-history-chart-line>
      </div> `;
    }
    return html`<div class="entry-container-spaced">
      <state-history-chart-timeline
        .hass=${this.hass}
        .data=${item}
        .startTime=${this._computedStartTime}
        .endTime=${this._computedEndTime}
        .noSingle=${this.noSingle}
        .names=${this.names}
        .narrow=${this.narrow}
        .alwaysShowTicks=${this.historyData.timeline.length &&
        this.historyData.timeline.length > 1}
      ></state-history-chart-timeline>
    </div> `;
  };

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return !(changedProps.size === 1 && changedProps.has("hass"));
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
        max-height: var(--logbook-max-height);
      }

      .entry-container {
        width: 100%;
        padding-left: 2px;
        padding-right: 2px;
      }

      .entry-container-spaced {
        /*
        / This is a workaround for a long standing issue with the
        / timeline tooltips overflowing the canvas
        / and not rendering correctly
        */
        width: 100%;
        padding-left: 2px;
        padding-right: 2px;
        padding-bottom: 140px;
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
