import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiRefresh } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-select";
import { fetchErrorLog, LogProvider } from "../../../data/error_log";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import { fetchHassioLogs } from "../../../data/hassio/supervisor";
import { HomeAssistant } from "../../../types";

const logProviders: LogProvider[] = [
  {
    key: "supervisor",
    name: "Supervisor",
  },
  {
    key: "core",
    name: "Home Assistant Core",
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

@customElement("error-log-card")
class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @state() private _isLogLoaded = false;

  @state() private _logHTML!: TemplateResult[] | string;

  @state() private _error?: string;

  @state() private _selectedLogProvider?: string;

  protected render(): TemplateResult {
    return html`
      <div class="error-log-intro">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        ${this._logHTML
          ? html`
              <ha-card>
                <div class="header">
                  ${this.hass.userData?.showAdvanced &&
                  isComponentLoaded(this.hass, "hassio")
                    ? html`
                        <ha-select
                          .label=${this.hass.localize(
                            "ui.panel.config.logs.log_provider"
                          )}
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
                  <ha-icon-button
                    .path=${mdiRefresh}
                    @click=${this._refresh}
                    .label=${this.hass.localize("ui.common.refresh")}
                  ></ha-icon-button>
                </div>
                <div class="card-content error-log">${this._logHTML}</div>
              </ha-card>
            `
          : ""}
        ${!this._logHTML
          ? html`
              <mwc-button raised @click=${this._refreshLogs}>
                ${this.hass.localize("ui.panel.config.logs.load_full_log")}
              </mwc-button>
            `
          : ""}
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.hass?.config.safe_mode) {
      this.hass.loadFragmentTranslation("config");
      this._refreshLogs();
    }
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("filter") && this._isLogLoaded) {
      this._refreshLogs();
    }
  }

  private async _setLogProvider(ev): Promise<void> {
    const provider = ev.target.value;
    if (provider === this._selectedLogProvider) {
      return;
    }

    this._selectedLogProvider = provider;
    this._refreshLogs();
  }

  private async _refresh(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    await this._refreshLogs();
    button.progress = false;
  }

  private async _refreshLogs(): Promise<void> {
    this._logHTML = this.hass.localize("ui.panel.config.logs.loading_log");
    let log: string;

    if (!this._selectedLogProvider && isComponentLoaded(this.hass, "hassio")) {
      this._selectedLogProvider = "core";
    }

    if (this._selectedLogProvider) {
      try {
        log = await fetchHassioLogs(this.hass, this._selectedLogProvider);
      } catch (err: any) {
        this._error = this.hass.localize(
          "ui.panel.config.logs.failed_get_logs",
          "provider",
          this._selectedLogProvider,
          "error",
          extractApiErrorMessage(err)
        );
        return;
      }
    } else {
      log = await fetchErrorLog(this.hass!);
    }

    this._isLogLoaded = true;

    this._logHTML = log
      ? log
          .split("\n")
          .filter((entry) => {
            if (this.filter) {
              return entry.toLowerCase().includes(this.filter.toLowerCase());
            }
            return entry;
          })
          .map((entry) => {
            if (entry.includes("INFO"))
              return html`<div class="info">${entry}</div>`;

            if (entry.includes("WARNING"))
              return html`<div class="warning">${entry}</div>`;

            if (
              entry.includes("ERROR") ||
              entry.includes("FATAL") ||
              entry.includes("CRITICAL")
            )
              return html`<div class="error">${entry}</div>`;

            return html`<div>${entry}</div>`;
          })
      : this.hass.localize("ui.panel.config.logs.no_errors");
  }

  static styles: CSSResultGroup = css`
    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      padding: 16px;
    }

    ha-select {
      display: block;
      max-width: 500px;
      width: 100%;
    }

    ha-icon-button {
      float: right;
    }

    .error-log {
      font-family: var(--code-font-family, monospace);
      clear: both;
      text-align: left;
      padding-top: 12px;
    }

    .error-log > div {
      overflow: auto;
      overflow-wrap: break-word;
    }

    .error-log > div:hover {
      background-color: var(--secondary-background-color);
    }

    .error {
      color: var(--error-color);
    }

    .warning {
      color: var(--warning-color);
    }

    :host-context([style*="direction: rtl;"]) mwc-button {
      direction: rtl;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "error-log-card": ErrorLogCard;
  }
}
