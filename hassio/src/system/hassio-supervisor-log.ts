import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  query,
} from "lit-element";

import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { fetchSupervisorLogs } from "../../../src/data/hassio/supervisor";

@customElement("hassio-supervisor-log")
class HassioSupervisorLog extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _error?: string;
  @query("#content") private _logContent!: HTMLDivElement;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  public render(): TemplateResult | void {
    return html`
      <paper-card>
        ${this._error
          ? html`
              <div class="errors">${this._error}</div>
            `
          : ""}
        <div class="card-content" id="content"></div>
        <div class="card-actions">
          <mwc-button @click=${this._refresh}>Refresh</mwc-button>
        </div>
      </paper-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      ANSI_HTML_STYLE,
      css`
        paper-card {
          width: 100%;
        }
        pre {
          white-space: pre-wrap;
        }
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
      `,
    ];
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    try {
      const content = await fetchSupervisorLogs(this.hass);
      while (this._logContent.lastChild) {
        this._logContent.removeChild(this._logContent.lastChild as Node);
      }
      this._logContent.appendChild(parseTextToColoredPre(content));
    } catch (err) {
      this._error = `Failed to get supervisor logs, ${err.body?.message ||
        err}`;
    }
  }

  private async _refresh(): Promise<void> {
    await this._loadData();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-log": HassioSupervisorLog;
  }
}
