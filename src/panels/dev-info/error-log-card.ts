import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-spinner/paper-spinner";
import "../../components/buttons/ha-call-service-button";
import "../../components/buttons/ha-progress-button";
import { HomeAssistant } from "../../types";
import { LoggedError, fetchErrorLog } from "../../data/error_log";
import formatDateTime from "../../common/datetime/format_date_time";
import formatTime from "../../common/datetime/format_time";
import { showErrorLogDetailDialog } from "./show-dialog-error-log-detail";

const formatLogTime = (date, language: string) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const dateTime = new Date(date * 1000);
  const dateTimeDay = new Date(date * 1000).setHours(0, 0, 0, 0);

  return dateTimeDay < today
    ? formatDateTime(dateTime, language)
    : formatTime(dateTime, language);
};

class ErrorLogCard extends LitElement {
  public hass?: HomeAssistant;
  private _items?: LoggedError[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _items: {},
    };
  }

  protected render(): TemplateResult | void {
    return html`
      <div class="error-log">
        <paper-card heading="Error Log">
          ${this._items === undefined
            ? html`
                <div class="loading-container">
                  <paper-spinner active></paper-spinner>
                </div>
              `
            : html`
                ${this._items.length === 0
                  ? html`
                      <div class="card-content">There are no new issues!</div>
                    `
                  : this._items.map(
                      (item) => html`
                        <paper-item @click=${this._openLog} .logItem=${item}>
                          <paper-item-body two-line>
                            <div class="row">
                              ${item.message}
                            </div>
                            <div secondary>
                              ${formatLogTime(
                                item.timestamp,
                                this.hass!.language
                              )}
                              ${item.source} (${item.level})
                            </div>
                          </paper-item-body>
                        </paper-item>
                      `
                    )}

                <div class="card-actions">
                  <ha-call-service-button
                    .hass=${this.hass}
                    domain="system_log"
                    service="clear"
                    >Clear</ha-call-service-button
                  >
                  <ha-progress-button @click=${this._fetchData}
                    >Refresh</ha-progress-button
                  >
                </div>
              `}
        </paper-card>
      </div>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._fetchData();
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  protected serviceCalled(ev): void {
    // Check if this is for us
    if (ev.detail.success && ev.detail.domain === "system_log") {
      // Do the right thing depending on service
      if (ev.detail.service === "clear") {
        this._items = [];
      }
    }
  }

  private async _fetchData(): Promise<void> {
    this._items = undefined;
    this._items = await fetchErrorLog(this.hass!);
  }

  private _openLog(ev: Event): void {
    const item = (ev.currentTarget as any).logItem;
    showErrorLogDetailDialog(this, { item });
  }

  static get styles(): CSSResult {
    return css`
      paper-card {
        display: block;
        padding-top: 16px;
      }

      paper-item {
        cursor: pointer;
      }

      .error-log {
        margin: 16px;
        border-top: 1px solid var(--light-primary-color);
        padding-top: 16px;
      }

      .loading-container {
        @apply --layout-vertical;
        @apply --layout-center-center;
        height: 100px;
      }
    `;
  }
}

customElements.define("error-log-card", ErrorLogCard);
