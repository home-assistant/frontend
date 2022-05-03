import "../../../src/components/ha-ansi-to-html";
import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-card";
import "../../../src/components/ha-select";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { fetchHassioLogs } from "../../../src/data/hassio/supervisor";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-loading-screen";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
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
      <ha-card outlined>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        ${this.hass.userData?.showAdvanced
          ? html`
              <ha-select
                .label=${this.supervisor.localize("system.log.log_provider")}
                @selected=${this._setLogProvider}
                .value=${this._selectedLogProvider}
              >
                ${logProviders.map(
                  (provider) => html`
                    <mwc-list-item .value=${provider.key}>
                      ${provider.name}
                    </mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}

        <div class="card-content" id="content">
          ${this._content
            ? html`<ha-ansi-to-html .content=${this._content}>
              </ha-ansi-to-html>`
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
    const provider = ev.target.value;
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
        ha-select {
          width: 100%;
          margin-bottom: 4px;
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
