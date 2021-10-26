import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { throttle } from "../../common/util/throttle";
import "../../components/chart/state-history-charts";
import { getRecentWithCache } from "../../data/cached-history";
import { HistoryResult } from "../../data/history";
import { HomeAssistant } from "../../types";
import { closeDialog } from "../make-dialog-manager";

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

    const href = "/history?entity_id=" + this.entityId;

    return html`${isComponentLoaded(this.hass, "history")
      ? html` <div class="header">
            <div class="title">
              ${this.hass.localize("ui.dialogs.more_info_control.history")}
            </div>
            <a href=${href} @click=${this.closeDialog}
              >${this.hass.localize(
                "ui.dialogs.more_info_control.show_more"
              )}</a
            >
          </div>
          <state-history-charts
            up-to-now
            .hass=${this.hass}
            .historyData=${this._stateHistory}
            .isLoadingData=${!this._stateHistory}
          ></state-history-charts>`
      : ""} `;
  }

  protected firstUpdated(): void {
    this.addEventListener("click", (ev) => {
      if ((ev.composedPath()[0] as HTMLElement).tagName === "A") {
        setTimeout(() => closeDialog("ha-more-info-dialog"), 500);
      }
    });
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

  public closeDialog(): void {
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
        .header > a:visited {
          color: var(--primary-color);
        }
        .title {
          font-family: var(--paper-font-title_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-title_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-title_-_font-size);
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
