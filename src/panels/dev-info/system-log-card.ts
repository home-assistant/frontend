import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../types";
import { fetchSystemLog } from "../../data/system_log";

class SystemLogCard extends LitElement {
  public hass?: HomeAssistant;
  private _systemLog?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _systemLog: {},
    };
  }

  protected render(): TemplateResult | void {
    return html`
      <p class="system-log-intro">
        ${this._systemLog
          ? html`
              <paper-icon-button
                icon="hass:refresh"
                @click=${this._refreshSystemLog}
              ></paper-icon-button>
            `
          : html`
              <paper-button raised @click=${this._refreshSystemLog}>
                Load Full Home Assistant Log
              </paper-button>
            `}
      </p>
      <div class="system-log">${this._systemLog}</div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .system-log-intro {
        text-align: center;
        margin: 16px;
      }

      paper-icon-button {
        float: right;
      }

      .system-log {
        @apply --paper-font-code)
          clear: both;
        white-space: pre-wrap;
        margin: 16px;
      }
    `;
  }

  private async _refreshSystemLog(): Promise<void> {
    this._systemLog = "Loading full system log…";
    const log = await fetchSystemLog(this.hass!);
    this._systemLog = log || "No log at this time.";
  }
}

customElements.define("system-log-card", SystemLogCard);
