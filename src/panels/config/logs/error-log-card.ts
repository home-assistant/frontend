import "@material/mwc-button";
import "../../../components/ha-icon-button";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fetchErrorLog } from "../../../data/error_log";
import { HomeAssistant } from "../../../types";

class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _errorLog?: string;

  protected render(): TemplateResult {
    return html`
      <p class="error-log-intro">
        ${this._errorLog
          ? html`
              <ha-icon-button
                icon="hass:refresh"
                @click=${this._refreshErrorLog}
              ></ha-icon-button>
            `
          : html`
              <mwc-button raised @click=${this._refreshErrorLog}>
                ${this.hass.localize("ui.panel.config.logs.load_full_log")}
              </mwc-button>
            `}
      </p>
      <div class="error-log">${this._errorLog}</div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.hass?.config.safe_mode) {
      this._refreshErrorLog();
    }
  }

  static get styles(): CSSResult {
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
        white-space: pre-wrap;
        margin: 16px;
      }
    `;
  }

  private async _refreshErrorLog(): Promise<void> {
    this._errorLog = this.hass.localize("ui.panel.config.logs.loading_log");
    const log = await fetchErrorLog(this.hass!);
    this._errorLog =
      log || this.hass.localize("ui.panel.config.logs.no_errors");
  }
}

customElements.define("error-log-card", ErrorLogCard);
