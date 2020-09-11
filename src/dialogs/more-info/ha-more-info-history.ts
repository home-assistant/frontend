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
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import "../../components/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { HistoryResult } from "../../data/history";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";

@customElement("ha-more-info-history")
export class MoreInfoHistory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @internalProperty() private _stateHistory?: HistoryResult;

  private _historyRefreshInterval?: number;

  protected render(): TemplateResult {
    if (!this.entityId) {
      return html``;
    }

    return html`${isComponentLoaded(this.hass, "history")
      ? html`<state-history-charts
          up-to-now
          .hass=${this.hass}
          .historyData=${this._stateHistory}
          .isLoadingData=${!this._stateHistory}
        ></state-history-charts>`
      : ""} `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this.entityId) {
      clearInterval(this._historyRefreshInterval);
    }

    if (changedProps.has("entityId")) {
      this._stateHistory = undefined;

      this._getStateHistory();

      clearInterval(this._historyRefreshInterval);
      this._historyRefreshInterval = window.setInterval(() => {
        this._getStateHistory();
      }, 60 * 1000);
    }
  }

  private async _getStateHistory(): Promise<void> {
    if (!isComponentLoaded(this.hass, "history")) {
      return;
    }
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

  static get styles() {
    return [
      haStyle,
      css`
        state-history-charts {
          display: block;
          margin-bottom: 16px;
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
