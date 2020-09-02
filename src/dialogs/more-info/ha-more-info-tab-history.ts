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
import { classMap } from "lit-html/directives/class-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import "../../components/ha-circular-progress";
import "../../components/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { HistoryResult } from "../../data/history";
import { getLogbookData, LogbookEntry } from "../../data/logbook";
import "../../panels/logbook/ha-logbook";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";

@customElement("ha-more-info-tab-history")
export class MoreInfoTabHistoryDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @internalProperty() private _stateHistory?: HistoryResult;

  @internalProperty() private _isLoading = false;

  private _entries: LogbookEntry[] = [];

  private _persons = {};

  private _historyRefreshInterval?: number;

  protected render(): TemplateResult {
    if (!this.entityId) {
      return html``;
    }
    const entityId = this.entityId;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html``;
    }

    return html`
      ${this._isLoading
        ? html`
            <ha-circular-progress
              active
              alt=${this.hass.localize("ui.common.loading")}
            ></ha-circular-progress>
          `
        : html`
            <state-history-charts
              up-to-now
              .hass=${this.hass}
              .historyData=${this._stateHistory}
            ></state-history-charts>
            <ha-logbook
              narrow
              no-click
              no-icon
              no-name
              class=${classMap({ "no-entries": !this._entries.length })}
              .hass=${this.hass}
              .entries=${this._entries}
              .userIdToName=${this._persons}
            ></ha-logbook>
          `}
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this.entityId) {
      clearInterval(this._historyRefreshInterval);
    }

    if (changedProps.has("entityId")) {
      this._refreshData();
    }
  }

  private async _refreshData(): Promise<void> {
    this._isLoading = true;
    this._fetchPersonNames();
    const fetchHistoryDone = this._getStateHistory();
    const fetchLogBookDone = this._getLogBookData();

    await Promise.all([fetchHistoryDone, fetchLogBookDone]);

    this._isLoading = false;

    clearInterval(this._historyRefreshInterval);
    this._historyRefreshInterval = window.setInterval(() => {
      this._getStateHistory();
    }, 60 * 1000);
  }

  private async _getStateHistory(): Promise<void> {
    this._stateHistory = await getRecentWithCache(
      this.hass!,
      this.entityId,
      {
        refresh: 60,
        cacheKey: `more_info.${this.entityId}`,
        hoursToShow: 24,
      },
      this.hass!.localize,
      this.hass!.language
    );
  }

  private async _getLogBookData() {
    const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    const entries = await getLogbookData(
      this.hass,
      yesterday.toISOString(),
      now.toISOString(),
      this.entityId,
      true
    );

    // @ts-ignore
    this._entries = entries;
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
      haStyleDialog,
      css`
        ha-circular-progress {
          display: flex;
          justify-content: center;
        }
        state-history-charts {
          display: block;
          margin-bottom: 16px;
        }

        ha-logbook:not(.no-entries) {
          height: 360px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-tab-history": MoreInfoTabHistoryDialog;
  }
}
