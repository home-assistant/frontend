import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
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
import {
  fetchAudioLogs,
  fetchDNSLogs,
  fetchHostLogs,
  fetchMulticastLogs,
  fetchSupervisorLogs,
} from "../../../src/data/hassio/supervisor";

@customElement("hassio-supervisor-log")
class HassioSupervisorLog extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _error?: string;
  @property() private _logSource:
    | "Supervisor"
    | "Host"
    | "DNS"
    | "Audio"
    | "Multicast" = "Supervisor";
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
        <paper-dropdown-menu
          label="Log source"
          @iron-select=${this._setLogSource}
        >
          <paper-listbox
            slot="dropdown-content"
            attr-for-selected="source"
            .selected=${this._logSource}
          >
            ${["Supervisor", "Host", "DNS", "Audio", "Multicast"].map(
              (source) => {
                return html`
                  <paper-item source=${source}>${source}</paper-item>
                `;
              }
            )}
          </paper-listbox>
        </paper-dropdown-menu>
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
        paper-dropdown-menu {
          padding: 0 2%;
          width: 96%;
        }
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
        .card-content {
          padding-top: 0px;
        }
      `,
    ];
  }

  private async _setLogSource(ev): Promise<void> {
    const source = ev.detail.item.getAttribute("source");
    this._logSource = source;
    await this._loadData();
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    let content!: string;
    try {
      if (this._logSource === "Supervisor") {
        content = await fetchSupervisorLogs(this.hass);
      } else if (this._logSource == "Host") {
        content = await fetchHostLogs(this.hass);
      } else if (this._logSource == "DNS") {
        content = await fetchDNSLogs(this.hass);
      } else if (this._logSource == "Audio") {
        content = await fetchAudioLogs(this.hass);
      } else if (this._logSource == "Multicast") {
        content = await fetchMulticastLogs(this.hass);
      }
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
