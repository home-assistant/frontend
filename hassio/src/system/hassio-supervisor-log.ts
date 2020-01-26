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

@customElement("hassio-supervisor-log")
class HassioSupervisorLog extends LitElement {
  @property() public hass!: HomeAssistant;
  @query("#content") private _logContent!: HTMLDivElement;

  public connectedCallback(): void {
    super.connectedCallback();
    this._loadData();
  }

  public render(): TemplateResult | void {
    return html`
      <paper-card>
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
        pre {
          white-space: pre-wrap;
        }
      `,
    ];
  }

  private _loadData(): void {
    this.hass.callApi("GET", "hassio/supervisor/logs").then(
      (text) => {
        while (this._logContet.lastChild) {
          this._logContet.removeChild(this._logContet.lastChild as Node);
        }
        this._logContet.appendChild(parseTextToColoredPre(text));
      },
      () => {
        this._logContet.innerHTML =
          '<span class="fg-red bold">Error fetching logs</span>';
      }
    );
  }

  private _refresh(): void {
    this._loadData();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-log": HassioSupervisorLog;
  }
}
