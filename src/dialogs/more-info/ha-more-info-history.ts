import { startOfYesterday, subHours } from "date-fns";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeDomain } from "../../common/entity/compute_domain";
import { createSearchParam } from "../../common/url/search-params";
import "../../components/chart/state-history-charts";
import "../../components/chart/statistics-chart";
import type { HistoryResult } from "../../data/history";
import {
  computeHistory,
  subscribeHistoryStatesTimeWindow,
} from "../../data/history";
import type {
  Statistics,
  StatisticsMetaData,
  StatisticsTypes,
} from "../../data/recorder";
import { fetchStatistics, getStatisticMetadata } from "../../data/recorder";
import { getSensorNumericDeviceClasses } from "../../data/sensor";
import type { HomeAssistant } from "../../types";
import { haStyle } from "../../resources/styles";

declare global {
  interface HASSDomEvents {
    closed: undefined;
  }
}

const statTypes: StatisticsTypes = ["state", "min", "mean", "max"];

@customElement("ha-more-info-history")
export class MoreInfoHistory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _stateHistory?: HistoryResult;

  @state() private _statistics?: Statistics;

  private _showMoreHref = "";

  private _statNames?: Record<string, string>;

  private _interval?: number;

  private _subscribed?: Promise<(() => Promise<void>) | undefined>;

  private _error?: string;

  private _metadata?: Record<string, StatisticsMetaData>;

  protected render() {
    if (!this.entityId) {
      return nothing;
    }

    return html`${isComponentLoaded(this.hass, "history")
      ? html`<div class="header">
            <h2>
              ${this.hass.localize("ui.dialogs.more_info_control.history")}
            </h2>
            ${__DEMO__
              ? nothing
              : html`<a href=${this._showMoreHref}
                  >${this.hass.localize(
                    "ui.dialogs.more_info_control.show_more"
                  )}</a
                >`}
          </div>
          ${this._error
            ? html`<div class="errors">${this._error}</div>`
            : this._statistics
              ? html`<statistics-chart
                  .hass=${this.hass}
                  .isLoadingData=${!this._statistics}
                  .statisticsData=${this._statistics}
                  .metadata=${this._metadata}
                  .statTypes=${statTypes}
                  .names=${this._statNames}
                  hide-legend
                  .clickForMoreInfo=${false}
                ></statistics-chart>`
              : html`<state-history-charts
                  up-to-now
                  .hass=${this.hass}
                  .historyData=${this._stateHistory}
                  .isLoadingData=${!this._stateHistory}
                  .showNames=${false}
                  .clickForMoreInfo=${false}
                ></state-history-charts>`}`
      : ""}`;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (changedProps.has("entityId")) {
      this._stateHistory = undefined;
      this._statistics = undefined;

      if (!this.entityId) {
        return;
      }

      const params = {
        entity_id: this.entityId,
        start_date: startOfYesterday().toISOString(),
        back: "1",
      };

      this._showMoreHref = `/history?${createSearchParam(params)}`;

      this._getStateHistory();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this.entityId) {
      this._getStateHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _unsubscribeHistory() {
    clearInterval(this._interval);
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  private _redrawGraph() {
    if (this._stateHistory) {
      this._stateHistory = { ...this._stateHistory };
    }
  }

  private _setRedrawTimer() {
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    this._interval = window.setInterval(() => this._redrawGraph(), 1000 * 60);
  }

  private async _getStatisticsMetaData(statisticIds: string[] | undefined) {
    const statsMetadataArray = await getStatisticMetadata(
      this.hass,
      statisticIds
    );
    const statisticsMetaData = {};
    statsMetadataArray.forEach((x) => {
      statisticsMetaData[x.statistic_id] = x;
    });
    return statisticsMetaData;
  }

  private async _getStateHistory(): Promise<void> {
    if (
      isComponentLoaded(this.hass, "recorder") &&
      computeDomain(this.entityId) === "sensor"
    ) {
      const stateObj = this.hass.states[this.entityId];
      // If there is no state class, the integration providing the entity
      // has not opted into statistics so there is no need to check as it
      // requires another round-trip to the server.
      if (stateObj && stateObj.attributes.state_class) {
        // Fire off the metadata and fetch at the same time
        // to avoid waiting in sequence so the UI responds
        // faster.
        const _metadata = this._getStatisticsMetaData([this.entityId]);
        const _statistics = fetchStatistics(
          this.hass!,
          subHours(new Date(), 24),
          undefined,
          [this.entityId],
          "5minute",
          undefined,
          statTypes
        );
        const [metadata, statistics] = await Promise.all([
          _metadata,
          _statistics,
        ]);
        if (metadata && Object.keys(metadata).length) {
          this._metadata = metadata;
          this._statistics = statistics;
          this._statNames = { [this.entityId]: "" };
          return;
        }
      }
    }

    if (!isComponentLoaded(this.hass, "history")) {
      return;
    }
    if (this._subscribed) {
      this._unsubscribeHistory();
    }

    const { numeric_device_classes: sensorNumericDeviceClasses } =
      await getSensorNumericDeviceClasses(this.hass);

    this._subscribed = subscribeHistoryStatesTimeWindow(
      this.hass!,
      (combinedHistory) => {
        if (!this._subscribed) {
          // Message came in before we had a chance to unload
          return;
        }
        this._stateHistory = computeHistory(
          this.hass!,
          combinedHistory,
          [this.entityId],
          this.hass!.localize,
          sensorNumericDeviceClasses
        );
      },
      24,
      [this.entityId]
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
      return undefined;
    });
    this._setRedrawTimer();
  }

  static styles = [
    haStyle,
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
      h2 {
        margin: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-history": MoreInfoHistory;
  }
}
