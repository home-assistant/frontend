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
import {
  HassioAddonDetails,
  fetchHassioAddonLogs,
} from "../../../src/data/hassio";
import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";

@customElement("hassio-addon-logs")
class HassioAddonLogs extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @query("#content") private _logContet!: any;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult | void {
    return html`
      <paper-card heading="Log">
        ${this.error
          ? html`
              <div class="errors">${this.error}</div>
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
        :host,
        paper-card {
          display: block;
        }
        pre {
          overflow-x: auto;
          white-space: pre-wrap;
          overflow-wrap: break-word;
        }
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
      `,
    ];
  }

  private async _loadData(): Promise<void> {
    this.error = undefined;
    try {
      const content = await fetchHassioAddonLogs(this.hass, this.addon.slug);
      while (this._logContet.lastChild) {
        this._logContet.removeChild(this._logContet.lastChild as Node);
      }
      this._logContet.appendChild(parseTextToColoredPre(content));
    } catch (err) {
      this.error = `Failed to get addon logs, ${err.body.message}`;
    }
  }

  private async _refresh(): Promise<void> {
    await this._loadData();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-logs": HassioAddonLogs;
  }
}
