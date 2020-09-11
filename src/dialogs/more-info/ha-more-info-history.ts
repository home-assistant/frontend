import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import "../../components/ha-circular-progress";
import "../../components/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { HistoryResult } from "../../data/history";
import { getLogbookData, LogbookEntry } from "../../data/logbook";
import "../../panels/logbook/ha-logbook";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { throttleAndQueue } from "../../common/util/throttle";

@customElement("ha-more-info-history")
export class MoreInfoHistory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @internalProperty() private _stateHistory?: HistoryResult;

  @internalProperty() private _entries?: LogbookEntry[];

  @internalProperty() private _persons = {};

  private _historyRefreshInterval?: number;

  private _lastLogbookDate?: Date;

  private _throttleHistoryFunction?: Function;

  protected render(): TemplateResult {
    if (!this.entityId) {
      return html``;
    }
    const stateObj = this.hass.states[this.entityId];

    if (!stateObj) {
      return html``;
    }

    return html`
      <state-history-charts
        up-to-now
        .hass=${this.hass}
        .historyData=${this._stateHistory}
        .isLoadingData=${!this._stateHistory}
      ></state-history-charts>
      ${!this._entries
        ? html`
            <ha-circular-progress
              active
              alt=${this.hass.localize("ui.common.loading")}
            ></ha-circular-progress>
          `
        : this._entries.length
        ? html`
            <ha-logbook
              narrow
              no-icon
              no-name
              style=${styleMap({
                height: `${(this._entries.length + 1) * 56}px`,
              })}
              .hass=${this.hass}
              .entries=${this._entries}
              .userIdToName=${this._persons}
            ></ha-logbook>
          `
        : html`
            <div class="no-entries">
              ${this.hass.localize("ui.components.logbook.entries_not_found")}
            </div>
          `}
    `;
  }

  protected firstUpdated(): void {
    this._fetchPersonNames();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this.entityId) {
      clearInterval(this._historyRefreshInterval);
      this._stateHistory = undefined;
      this._entries = undefined;
      this._lastLogbookDate = undefined;
      this._throttleHistoryFunction = undefined;
      return;
    }

    if (changedProps.has("entityId")) {
      this._stateHistory = undefined;
      this._entries = undefined;
      this._lastLogbookDate = undefined;
      this._throttleHistoryFunction = undefined;

      this._getStateHistory();
      this._getLogBookData();

      this._throttleHistoryFunction = throttleAndQueue(
        () => {
          this._getStateHistory();
          this._getLogBookData();
        },
        10000,
        5000
      );
      return;
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const stateObj = this.hass.states[this.entityId];
    const oldHass = changedProps.get("hass") as HomeAssistant;
    const oldStateObj = oldHass.states[this.entityId];

    if (stateObj !== oldStateObj && this._throttleHistoryFunction) {
      this._throttleHistoryFunction();
    }
  }

  private async _getStateHistory(): Promise<void> {
    this._stateHistory = await getRecentWithCache(
      this.hass!,
      this.entityId,
      {
        refresh: 10,
        cacheKey: `more_info.${this.entityId}`,
        hoursToShow: 24,
      },
      this.hass!.localize,
      this.hass!.language
    );
  }

  private async _getLogBookData() {
    const lastDate =
      this._lastLogbookDate ||
      new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const newEntries = await getLogbookData(
      this.hass,
      lastDate.toISOString(),
      now.toISOString(),
      this.entityId,
      true
    );

    if (this._entries) {
      this._entries = [...newEntries, ...this._entries];
    } else {
      this._entries = newEntries;
    }

    this._lastLogbookDate = now;
  }

  private _fetchPersonNames() {
    Object.values(this.hass.states).forEach((entity) => {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        this._persons[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    });
  }

  static get styles() {
    return [
      haStyle,
      css`
        state-history-charts {
          display: block;
          margin-bottom: 16px;
        }
        .no-entries {
          text-align: center;
          padding: 16px;
        }
        ha-logbook {
          max-height: 360px;
        }

        ha-circular-progress {
          display: flex;
          justify-content: center;
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
