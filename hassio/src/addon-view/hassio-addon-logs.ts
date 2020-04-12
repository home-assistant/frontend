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
import { HomeAssistant, Route } from "../../../src/types";
import {
  HassioAddonDetails,
  fetchHassioAddonLogs,
} from "../../../src/data/hassio/addon";
import { ANSI_HTML_STYLE, parseTextToColoredPre } from "../ansi-to-html";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { PageNavigation } from "../../../src/layouts/hass-tabs-subpage";

import "../../../src/layouts/hass-tabs-subpage";

@customElement("hassio-addon-logs")
class HassioAddonLogs extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;
  @property() public route!: Route;
  @property() public sections!: PageNavigation[];
  @property() private _error?: string;
  @query("#content") private _logContent!: any;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${this.sections}
        hassio
      >
        <div class="container">
          <div class="content">
            <paper-card heading="Log">
              <div class="card-content" id="content">
                ${this._error
                  ? html`
                      <div class="errors">${this._error}</div>
                    `
                  : ""}
              </div>
              <div class="card-actions">
                <mwc-button @click=${this._refresh}>Refresh</mwc-button>
              </div>
            </paper-card>
          </div>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      ANSI_HTML_STYLE,
      css`
        .container {
          display: flex;
          width: 100%;
          justify-content: center;
        }
        .content {
          display: flex;
          min-width: 600px;
          max-width: calc(100% - 8px);
          margin-bottom: 24px;
          padding: 24px 0 32px;
          flex-direction: column;
        }
        @media only screen and (max-width: 600px) {
          .content {
            max-width: 100%;
            min-width: 100%;
          }
        }
        paper-card {
          display: block;
        }
        pre {
          margin: 0;
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
    this._error = undefined;
    try {
      const content = await fetchHassioAddonLogs(this.hass, this.addon.slug);
      while (this._logContent.lastChild) {
        this._logContent.removeChild(this._logContent.lastChild as Node);
      }
      this._logContent.appendChild(parseTextToColoredPre(content));
    } catch (err) {
      this._error = `Failed to get addon logs, ${err.body?.message || err}`;
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
