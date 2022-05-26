import "@lit-labs/virtualizer";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import {
  HistoryResult,
  LineChartUnit,
  TimelineEntity,
} from "../../data/history";
import type { HomeAssistant } from "../../types";
import "./state-history-chart-line";
import "./state-history-chart-timeline";

@customElement("state-history-charts")
class StateHistoryCharts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public historyData!: HistoryResult;

  @property({ type: Boolean }) public names = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ attribute: false }) public endTime?: Date;

  @property({ type: Boolean, attribute: "up-to-now" }) public upToNow = false;

  @property({ type: Boolean, attribute: "no-single" }) public noSingle = false;

  @property({ type: Boolean }) public isLoadingData = false;

  @state() private _computedStartTime?: Date;

  @state() private _computedEndTime?: Date;

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

    if (this.virtualize) {
      const combinedItems = Array.prototype.concat.apply(
        [],
        [this.historyData.timeline, this.historyData.line]
      );
      return html`<lit-virtualizer
        scroller
        class="ha-scrollbar"
        .items=${combinedItems}
        .renderItem=${this._renderHistoryItem}
      >
      </lit-virtualizer>`;
    }

    return html`
      ${this.historyData.timeline.length
        ? html`
            <state-history-chart-timeline
              .hass=${this.hass}
              .data=${this.historyData.timeline}
              .startTime=${this._computedStartTime}
              .endTime=${this._computedEndTime}
              .noSingle=${this.noSingle}
              .names=${this.names}
            ></state-history-chart-timeline>
          `
        : html``}
      ${this.historyData.line.map(
        (line) => html`
          <state-history-chart-line
            .hass=${this.hass}
            .unit=${line.unit}
            .data=${line.data}
            .identifier=${line.identifier}
            .isSingleDevice=${!this.noSingle &&
            line.data &&
            line.data.length === 1}
            .endTime=${this._computedEndTime}
            .names=${this.names}
          ></state-history-chart-line>
        `
      )}
    `;
  }

  private _renderHistoryItem = (
    item: TimelineEntity | LineChartUnit,
    index: number
  ): TemplateResult => {
    if (!item || index === undefined) {
      return html``;
    }
    if ("unit" in item) {
      return html`
        <state-history-chart-line
          .hass=${this.hass}
          .unit=${item.unit}
          .data=${item.data}
          .identifier=${item.identifier}
          .isSingleDevice=${!this.noSingle &&
          item.data &&
          item.data.length === 1}
          .endTime=${this._computedEndTime}
          .names=${this.names}
        ></state-history-chart-line>
      `;
    }
    return html`
      <state-history-chart-timeline
        .hass=${this.hass}
        .data=${[item]}
        .startTime=${this._computedStartTime}
        .endTime=${this._computedEndTime}
        .noSingle=${this.noSingle}
        .names=${this.names}
      ></state-history-chart-timeline>
    `;
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        /* height of single timeline chart = 60px */
        min-height: 60px;
      }
      .info {
        text-align: center;
        line-height: 60px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-history-charts": StateHistoryCharts;
  }
}
