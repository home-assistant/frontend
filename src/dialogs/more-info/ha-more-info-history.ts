import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { throttle } from "../../common/util/throttle";
import "../../components/chart/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { HistoryResult } from "../../data/history";
import { HomeAssistant } from "../../types";

@customElement("ha-more-info-history")
export class MoreInfoHistory extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @state() private _stateHistory?: HistoryResult;

  private _throttleGetStateHistory = throttle(() => {
    this._getStateHistory();
  }, 10000);

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

    if (changedProps.has("entityId")) {
      this._stateHistory = undefined;

      if (!this.entityId) {
        return;
      }

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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-history": MoreInfoHistory;
  }
}
