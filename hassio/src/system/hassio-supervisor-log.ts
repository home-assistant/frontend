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
import { haStyle } from "../../../src/resources/styles";
import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";

@customElement("hassio-supervisor-log")
class HassioSupervisorLog extends LitElement {
  @property() public hass!: HomeAssistant;
  @query("#content") private _logContet!: any;

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

  protected firstUpdated() {
    this.loadData();
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

  protected loadData() {
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

  protected refresh() {
    this.loadData();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-log": HassioSupervisorLog;
  }
}
