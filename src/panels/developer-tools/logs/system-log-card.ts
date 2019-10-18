import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
  TemplateResult,
  customElement,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-spinner/paper-spinner";
import "../../../components/ha-card";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/buttons/ha-progress-button";
import { HomeAssistant } from "../../../types";
import { LoggedError, fetchSystemLog } from "../../../data/system_log";
import formatDateTime from "../../../common/datetime/format_date_time";
import formatTime from "../../../common/datetime/format_time";
import { showSystemLogDetailDialog } from "./show-dialog-system-log-detail";

const formatLogTime = (date, language: string) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const dateTime = new Date(date * 1000);
  const dateTimeDay = new Date(date * 1000).setHours(0, 0, 0, 0);

  return dateTimeDay < today
    ? formatDateTime(dateTime, language)
    : formatTime(dateTime, language);
};

@customElement("system-log-card")
export class SystemLogCard extends LitElement {
  public hass!: HomeAssistant;
  public loaded = false;
  private _items?: LoggedError[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _items: {},
    };
  }

  public async fetchData(): Promise<void> {
    this._items = undefined;
    this._items = await fetchSystemLog(this.hass!);
  }

  protected render(): TemplateResult | void {
    return html`
      <div class="system-log-intro">
        <ha-card>
          ${this._items === undefined
            ? html`
                <div class="loading-container">
                  <paper-spinner active></paper-spinner>
                </div>
              `
            : html`
                ${this._items.length === 0
                  ? html`
                      <div class="card-content">
                        ${this.hass.localize(
                          "ui.panel.developer-tools.tabs.logs.no_issues"
                        )}
                      </div>
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
                              ${item.count > 1
                                ? html`
                                    -
                                    ${this.hass.localize(
                                      "ui.panel.developer-tools.tabs.logs.multiple_messages",
                                      "time",
                                      formatLogTime(
                                        item.first_occured,
                                        this.hass!.language
                                      ),
                                      "counter",
                                      item.count
                                    )}
                                  `
                                : html``}
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
                    >${this.hass.localize(
                      "ui.panel.developer-tools.tabs.logs.clear"
                    )}</ha-call-service-button
                  >
                  <ha-progress-button @click=${this.fetchData}
                    >${this.hass.localize(
                      "ui.panel.developer-tools.tabs.logs.refresh"
                    )}</ha-progress-button
                  >
                </div>
              `}
        </ha-card>
      </div>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this.fetchData();
    this.loaded = true;
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

  private _openLog(ev: Event): void {
    const item = (ev.currentTarget as any).logItem;
    showSystemLogDetailDialog(this, { item });
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        padding-top: 16px;
      }

      paper-item {
        cursor: pointer;
      }

      .system-log-intro {
        margin: 16px;
      }

      .loading-container {
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "system-log-card": SystemLogCard;
  }
}
