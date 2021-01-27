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

  @property({ attribute: false }) public historyData!: HistoryResult;

  @property({ type: Boolean }) public names = false;

  @property({ attribute: false }) public endTime?: Date;

  @property({ type: Boolean }) public upToNow = false;

  @property({ type: Boolean, attribute: "no-single" }) public noSingle = false;

  @property({ type: Boolean }) public isLoadingData = false;

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

    const computedEndTime = this.upToNow
      ? new Date()
      : this.endTime || new Date();

    return html`
      ${this.historyData.timeline.length
        ? html`
            <state-history-chart-timeline
              .hass=${this.hass}
              .data=${this.historyData.timeline}
              .endTime=${computedEndTime}
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
            .endTime=${computedEndTime}
            .names=${this.names}
          ></state-history-chart-line>
        `
      )}
    `;
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
