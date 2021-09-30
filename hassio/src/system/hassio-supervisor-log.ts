import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-card";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { fetchHassioLogs } from "../../../src/data/hassio/supervisor";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-loading-screen";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-ansi-to-html";
import { hassioStyle } from "../resources/hassio-style";

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
    key: "core",
    name: "Core",
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

  @property({ attribute: false }) public supervisor!: Supervisor;

  @state() private _error?: string;

  @state() private _selectedLogProvider = "supervisor";

  @state() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-card>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        ${this.hass.userData?.showAdvanced
          ? html`
              <paper-dropdown-menu
                .label=${this.supervisor.localize("system.log.log_provider")}
                @iron-select=${this._setLogProvider}
              >
                <paper-listbox
                  slot="dropdown-content"
                  attr-for-selected="provider"
                  .selected=${this._selectedLogProvider}
                >
                  ${logProviders.map(
                    (provider) => html`
                      <paper-item provider=${provider.key}>
                        ${provider.name}
                      </paper-item>
                    `
                  )}
                </paper-listbox>
              </paper-dropdown-menu>
            `
          : ""}

        <div class="card-content" id="content">
          ${this._content
            ? html`<hassio-ansi-to-html .content=${this._content}>
              </hassio-ansi-to-html>`
            : html`<hass-loading-screen no-toolbar></hass-loading-screen>`}
        </div>
        <div class="card-actions">
          <ha-progress-button @click=${this._refresh}>
            ${this.supervisor.localize("common.refresh")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private async _setLogProvider(ev): Promise<void> {
    const provider = ev.detail.item.getAttribute("provider");
    this._selectedLogProvider = provider;
    this._loadData();
  }

  private async _refresh(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;
    await this._loadData();
    button.progress = false;
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;

    try {
      this._content = await fetchHassioLogs(
        this.hass,
        this._selectedLogProvider
      );
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "system.log.get_logs",
        "provider",
        this._selectedLogProvider,
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        ha-card {
          margin-top: 8px;
          width: 100%;
        }
        pre {
          white-space: pre-wrap;
        }
        paper-dropdown-menu {
          padding: 0 2%;
          width: 96%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-log": HassioSupervisorLog;
  }
}
