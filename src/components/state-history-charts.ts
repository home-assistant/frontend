import "./ha-circular-progress";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "./state-history-chart-line";
import "./state-history-chart-timeline";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import type { HomeAssistant } from "../types";
import { HistoryResult } from "../data/history";

@customElement("state-history-charts")
class StateHistoryCharts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public historyData!: HistoryResult;

  @property() public names = false;

  @property() public endTime;

  @property() public upToNow = false;

  @property() public noSingle = false;

  @property() public isLoadingData = false;

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

    return html`
      ${this.historyData.timeline.length
        ? html`
            <state-history-chart-timeline
              .hass=${this.hass}
              .data=${this.historyData.timeline}
              .end-time=${this._computeEndTime()}
              .no-single=${this.noSingle}
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
            .is-single-device=${!this.noSingle &&
            line.data &&
            line.data.length === 1}
            .end-time=${this._computeEndTime()}
            .names=${this.names}
          ></state-history-chart-line>
        `
      )}
    `;
  }

  private _isHistoryEmpty() {
    const historyDataEmpty =
      !this.historyData ||
      !this.historyData.timeline ||
      !this.historyData.line ||
      (this.historyData.timeline.length === 0 &&
        this.historyData.line.length === 0);
    return !this.isLoadingData && historyDataEmpty;
  }

  _computeEndTime() {
    // We don't really care about the value of historyData, but if it change we want to update
    // endTime.
    return this.upToNow ? new Date() : this.endTime;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        /* height of single timeline chart = 58px */
        min-height: 58px;
      }
      .info {
        text-align: center;
        line-height: 58px;
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
