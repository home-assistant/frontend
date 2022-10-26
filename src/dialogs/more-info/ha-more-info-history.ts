import { startOfYesterday, subHours } from "date-fns/esm";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { throttle } from "../../common/util/throttle";
import "../../components/chart/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { HistoryResult } from "../../data/history";
import {
  fetchStatistics,
  getStatisticMetadata,
  Statistics,
} from "../../data/recorder";
import { HomeAssistant } from "../../types";
import "../../components/chart/statistics-chart";
import { computeDomain } from "../../common/entity/compute_domain";

declare global {
  interface HASSDomEvents {
    closed: undefined;
  }
}

const statTypes = ["state", "min", "mean", "max"];

@customElement("ha-more-info-history")
export class MoreInfoHistory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @state() private _stateHistory?: HistoryResult;

  @state() private _statistics?: Statistics;

  private _showMoreHref = "";

  private _throttleGetStateHistory = throttle(() => {
    this._getStateHistory();
  }, 10000);

  protected render(): TemplateResult {
    if (!this.entityId) {
      return html``;
    }

    return html`${isComponentLoaded(this.hass, "history")
      ? html`<div class="header">
            <div class="title">
              ${this.hass.localize("ui.dialogs.more_info_control.history")}
            </div>
            <a href=${this._showMoreHref} @click=${this._close}
              >${this.hass.localize(
                "ui.dialogs.more_info_control.show_more"
              )}</a
            >
          </div>
          ${this._statistics
            ? html`<statistics-chart
                .hass=${this.hass}
                .isLoadingData=${!this._statistics}
                .statisticsData=${this._statistics}
                .statTypes=${statTypes}
              ></statistics-chart>`
            : html`<state-history-charts
                up-to-now
                .hass=${this.hass}
                .historyData=${this._stateHistory}
                .isLoadingData=${!this._stateHistory}
              ></state-history-charts>`}`
      : ""}`;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("entityId")) {
      this._stateHistory = undefined;
      this._statistics = undefined;

      if (!this.entityId) {
        return;
      }

      this._showMoreHref = `/history?entity_id=${
        this.entityId
      }&start_date=${startOfYesterday().toISOString()}`;

      this._throttleGetStateHistory();
      return;
    }

    if (!this.entityId || !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      oldHass &&
      this.hass.states[this.entityId] !== oldHass?.states[this.entityId]
    ) {
      // wait for commit of data (we only account for the default setting of 1 sec)
      setTimeout(this._throttleGetStateHistory, 1000);
    }
  }

  private async _getStateHistory(): Promise<void> {
    if (
      isComponentLoaded(this.hass, "recorder") &&
      computeDomain(this.entityId) === "sensor"
    ) {
      const metadata = await getStatisticMetadata(this.hass, [this.entityId]);
      if (metadata.length) {
        this._statistics = await fetchStatistics(
          this.hass!,
          subHours(new Date(), 24),
          undefined,
          [this.entityId],
          "5minute"
        );
        return;
      }
    }
    if (!isComponentLoaded(this.hass, "history")) {
      return;
    }
    this._stateHistory = await getRecentWithCache(
      this.hass!,
      this.entityId,
      {
        cacheKey: `more_info.${this.entityId}`,
        hoursToShow: 24,
      },
      this.hass!.localize,
      this.hass!.language
    );
  }

  private _close(): void {
    setTimeout(() => fireEvent(this, "close-dialog"), 500);
  }

  static get styles() {
    return [
      css`
        .header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .header > a,
        a:visited {
          color: var(--primary-color);
        }
        .title {
          font-family: var(--paper-font-title_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-title_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-subhead_-_font-size);
          font-weight: var(--paper-font-title_-_font-weight);
          letter-spacing: var(--paper-font-title_-_letter-spacing);
          line-height: var(--paper-font-title_-_line-height);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-history": MoreInfoHistory;
  }
}
