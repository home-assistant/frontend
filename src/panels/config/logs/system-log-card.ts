import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-icon-button";
import { domainToName } from "../../../data/integration";
import {
  fetchSystemLog,
  getLoggedErrorIntegration,
  isCustomIntegrationError,
  LoggedError,
} from "../../../data/system_log";
import { HomeAssistant } from "../../../types";
import { showSystemLogDetailDialog } from "./show-dialog-system-log-detail";
import { formatSystemLogTime } from "./util";

@customElement("system-log-card")
export class SystemLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  public loaded = false;

  @state() private _items?: LoggedError[];

  public async fetchData(): Promise<void> {
    this._items = undefined;
    this._items = await fetchSystemLog(this.hass!);
  }

  protected render(): TemplateResult {
    const integrations = this._items
      ? this._items.map((item) => getLoggedErrorIntegration(item))
      : [];
    return html`
      <div class="system-log-intro">
        <ha-card>
          ${this._items === undefined
            ? html`
                <div class="loading-container">
                  <ha-circular-progress active></ha-circular-progress>
                </div>
              `
            : html`
                ${this._items.length === 0
                  ? html`
                      <div class="card-content">
                        ${this.hass.localize("ui.panel.config.logs.no_issues")}
                      </div>
                    `
                  : this._items.map(
                      (item, idx) => html`
                        <paper-item @click=${this._openLog} .logItem=${item}>
                          <paper-item-body two-line>
                            <div class="row">${item.message[0]}</div>
                            <div secondary>
                              ${formatSystemLogTime(
                                item.timestamp,
                                this.hass!.locale
                              )}
                              –
                              ${html`(<span class=${item.level.toLowerCase()}
                                  >${this.hass.localize(
                                    "ui.panel.config.logs.level." +
                                      item.level.toLowerCase()
                                  )}</span
                                >) `}
                              ${integrations[idx]
                                ? `${domainToName(
                                    this.hass!.localize,
                                    integrations[idx]!
                                  )}${
                                    isCustomIntegrationError(item)
                                      ? ` (${this.hass.localize(
                                          "ui.panel.config.logs.custom_integration"
                                        )})`
                                      : ""
                                  }`
                                : item.source[0]}
                              ${item.count > 1
                                ? html`
                                    -
                                    ${this.hass.localize(
                                      "ui.panel.config.logs.multiple_messages",
                                      "time",
                                      formatSystemLogTime(
                                        item.first_occurred,
                                        this.hass!.locale
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
                      "ui.panel.config.logs.clear"
                    )}</ha-call-service-button
                  >
                  <ha-progress-button @click=${this.fetchData}
                    >${this.hass.localize(
                      "ui.panel.config.logs.refresh"
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

  static get styles(): CSSResultGroup {
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

      .error {
        color: var(--error-color);
      }

      .warning {
        color: var(--warning-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "system-log-card": SystemLogCard;
  }
}
