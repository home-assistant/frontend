import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import "../../../components/ha-icon-button";
import { fetchErrorLog } from "../../../data/error_log";
import { HomeAssistant } from "../../../types";

class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _errorHTML!: TemplateResult[] | string;

  protected render(): TemplateResult {
    return html`
      <div class="error-log-intro">
        ${this._errorHTML
          ? html`
              <ha-card>
                <ha-icon-button
                  icon="hass:refresh"
                  @click=${this._refreshErrorLog}
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
        @apply --paper-font-code)
          clear: both;
        text-align: left;
        padding-top: 12px;
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

    this._errorHTML = log
      ? log.split("\n").map((entry) => {
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
