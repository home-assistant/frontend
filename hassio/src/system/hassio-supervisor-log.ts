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
import { HomeAssistant } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";
import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";

@customElement("hassio-supervisor-log")
class HassioSupervisorLog extends LitElement {
  @property() public hass!: HomeAssistant;
  @query("#content") private _logContet!: any;

  protected firstUpdated() {
    this.loadData();
  }

  public render(): TemplateResult | void {
    return html`
      <paper-card>
        <div class="card-content" id="content"></div>
        <div class="card-actions">
          <mwc-button @click=${this.refresh}>Refresh</mwc-button>
        </div>
      </paper-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      hassioStyle,
      ANSI_HTML_STYLE,
      css`
        pre {
          white-space: pre-wrap;
        }
      `,
    ];
  }

  loadData() {
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

  refresh() {
    this.loadData();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-log": HassioSupervisorLog;
  }
}
