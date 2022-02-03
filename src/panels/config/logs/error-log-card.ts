import "@material/mwc-button";
import { mdiRefresh } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import "../../../components/ha-icon-button";
import { fetchErrorLog } from "../../../data/error_log";
import { HomeAssistant } from "../../../types";

class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @state() private _isLogLoaded = false;

  @state() private _errorHTML!: TemplateResult[] | string;

  protected render(): TemplateResult {
    return html`
      <div class="error-log-intro">
        ${this._errorHTML
          ? html`
              <ha-card>
                <ha-icon-button
                  .path=${mdiRefresh}
                  @click=${this._refreshErrorLog}
                  .label=${this.hass.localize("ui.common.refresh")}
                ></ha-icon-button>
                <div class="card-content error-log">${this._errorHTML}</div>
              </ha-card>
            `
          : html`
              <mwc-button raised @click=${this._refreshErrorLog}>
                ${this.hass.localize("ui.panel.config.logs.load_full_log")}
              </mwc-button>
            `}
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.hass?.config.safe_mode) {
      this.hass.loadFragmentTranslation("config");
      this._refreshErrorLog();
    }
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("filter") && this._isLogLoaded) {
      this._refreshErrorLog();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .error-log-intro {
        text-align: center;
        margin: 16px;
      }

      ha-icon-button {
        float: right;
      }

      .error-log {
        font-family: var(--code-font-family, monospace);
        clear: both;
        text-align: left;
        padding-top: 12px;
      }

      .error-log > div:hover {
        background-color: var(--secondary-background-color);
      }

      .error {
        color: var(--error-color);
      }

      .warning {
        color: var(--warning-color);
      }
    `;
  }

  private async _refreshErrorLog(): Promise<void> {
    this._errorHTML = this.hass.localize("ui.panel.config.logs.loading_log");
    const log = await fetchErrorLog(this.hass!);
    this._isLogLoaded = true;

    this._errorHTML = log
      ? log
          .split("\n")
          .filter((entry) => {
            if (this.filter) {
              return entry.toLowerCase().includes(this.filter.toLowerCase());
            }
            return entry;
          })
          .map((entry) => {
            if (entry.includes("INFO"))
              return html`<div class="info">${entry}</div>`;

            if (entry.includes("WARNING"))
              return html`<div class="warning">${entry}</div>`;

            if (
              entry.includes("ERROR") ||
              entry.includes("FATAL") ||
              entry.includes("CRITICAL")
            )
              return html`<div class="error">${entry}</div>`;

            return html`<div>${entry}</div>`;
          })
      : this.hass.localize("ui.panel.config.logs.no_errors");
  }
}

customElements.define("error-log-card", ErrorLogCard);
