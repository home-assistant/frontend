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
} from "lit-element";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";

import { fetchHassioLogs } from "../../../src/data/hassio/supervisor";

import "../components/hassio-ansi-to-html";
import { hassioStyle } from "../resources/hassio-style";
import "../../../src/layouts/loading-screen";

interface LogProvider {
  key: string;
  name: string;
}

const logProviders: LogProvider[] = [
  {
    key: "supervisor",
    name: "Supervisor",
  },
  {
    key: "host",
    name: "Host",
  },
  {
    key: "dns",
    name: "DNS",
  },
  {
    key: "audio",
    name: "Audio",
  },
  {
    key: "multicast",
    name: "Multicast",
  },
];

@customElement("hassio-supervisor-log")
class HassioSupervisorLog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() private _error?: string;

  @property() private _selectedLogProvider:
    | "supervisor"
    | "host"
    | "dns"
    | "audio"
    | "multicast" = "supervisor";

  @property() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  public render(): TemplateResult | void {
    return html`
      <paper-card>
        ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
        ${this.hass.userData?.showAdvanced
          ? html`
              <paper-dropdown-menu
                label="Log provider"
                @iron-select=${this._setLogProvider}
              >
                <paper-listbox
                  slot="dropdown-content"
                  attr-for-selected="provider"
                  .selected=${this._selectedLogProvider}
                >
                  ${logProviders.map((provider) => {
                    return html`
                      <paper-item provider=${provider.key}
                        >${provider.name}</paper-item
                      >
                    `;
                  })}
                </paper-listbox>
              </paper-dropdown-menu>
            `
          : ""}

        <div class="card-content" id="content">
          ${this._content
            ? html`<hassio-ansi-to-html
                .content=${this._content}
              ></hassio-ansi-to-html>`
            : html`<loading-screen></loading-screen>`}
        </div>
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

  private async _setLogProvider(ev): Promise<void> {
    const provider = ev.detail.item.getAttribute("provider");
    this._selectedLogProvider = provider;
    await this._loadData();
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    this._content = undefined;

    try {
      this._content = await fetchHassioLogs(
        this.hass,
        this._selectedLogProvider
      );
    } catch (err) {
      this._error = `Failed to get supervisor logs, ${
        err.body?.message || err
      }`;
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
