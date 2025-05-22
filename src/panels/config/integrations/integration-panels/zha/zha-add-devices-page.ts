import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-spinner";
import type { ZHADevice } from "../../../../../data/zha";
import { DEVICE_MESSAGE_TYPES, LOG_OUTPUT } from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { documentationUrl } from "../../../../../util/documentation-url";
import { zhaTabs } from "./zha-config-dashboard";
import "./zha-device-pairing-status-card";
import "../../../../../components/ha-textarea";

@customElement("zha-add-devices-page")
class ZHAAddDevicesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route?: Route;

  @state() private _error?: string;

  @state() private _discoveredDevices: Record<string, ZHADevice> = {};

  @state() private _formattedEvents = "";

  @state() private _active = false;

  @state() private _showHelp = false;

  @state() private _showLogs = false;

  private _ieeeAddress?: string;

  private _addDevicesTimeoutHandle: any = undefined;

  private _subscribed?: Promise<() => Promise<void>>;

  private _wakeLock?: Promise<WakeLockSentinel>;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.route && this.route.path && this.route.path !== "") {
      this._ieeeAddress = this.route.path.substring(1);
    } else {
      this._ieeeAddress = undefined;
    }
    this._subscribe();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
    this._error = undefined;
    this._discoveredDevices = {};
    this._formattedEvents = "";
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      changedProps.has("hass") &&
      !this._active &&
      !changedProps.get("hass")
    ) {
      this._subscribe();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route!}
        .tabs=${zhaTabs}
      >
        <mwc-button slot="toolbar-icon" @click=${this._toggleLogs}
          >${this._showLogs ? "Hide logs" : "Show logs"}</mwc-button
        >
        <div class="searching">
          ${this._active
            ? html`
                <h1>
                  ${this.hass!.localize(
                    "ui.panel.config.zha.add_device_page.spinner"
                  )}
                </h1>
                <ha-spinner aria-label="Searching"></ha-spinner>
              `
            : html`
                <div>
                  <mwc-button @click=${this._subscribe} class="search-button">
                    ${this.hass!.localize(
                      "ui.panel.config.zha.add_device_page.search_again"
                    )}
                  </mwc-button>
                </div>
              `}
        </div>
        ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
        <div class="content">
          ${Object.keys(this._discoveredDevices).length < 1
            ? html`
                <div class="discovery-text">
                  <h4>
                    ${this.hass.localize(
                      "ui.panel.config.zha.add_device_page.pairing_mode",
                      {
                        documentation_link: html`
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href=${documentationUrl(
                              this.hass,
                              "/integrations/zha#adding-devices"
                            )}
                          >
                            ${this.hass.localize(
                              "ui.panel.config.zha.add_device_page.pairing_mode_link"
                            )}
                          </a>
                        `,
                      }
                    )}
                  </h4>
                  <h4>
                    ${this.hass!.localize(
                      this._active
                        ? "ui.panel.config.zha.add_device_page.discovered_text"
                        : "ui.panel.config.zha.add_device_page.no_devices_found"
                    )}
                  </h4>
                </div>
              `
            : html`
                ${Object.values(this._discoveredDevices).map(
                  (device) => html`
                    <zha-device-pairing-status-card
                      class="card"
                      .hass=${this.hass}
                      .device=${device}
                      .narrow=${this.narrow}
                      .showHelp=${this._showHelp}
                    ></zha-device-pairing-status-card>
                  `
                )}
              `}
        </div>
        ${this._showLogs
          ? html`<ha-textarea
              readonly
              class="log"
              autogrow
              .value=${this._formattedEvents}
            >
            </ha-textarea>`
          : ""}
      </hass-tabs-subpage>
    `;
  }

  private _toggleLogs() {
    this._showLogs = !this._showLogs;
  }

  private _handleMessage(message: any): void {
    if (message.type === LOG_OUTPUT) {
      this._formattedEvents += message.log_entry.message + "\n";
    }
    if (message.type && DEVICE_MESSAGE_TYPES.includes(message.type)) {
      this._discoveredDevices[message.device_info.ieee] = message.device_info;
    }
  }

  private _unsubscribe(): void {
    this._active = false;
    if (this._addDevicesTimeoutHandle) {
      clearTimeout(this._addDevicesTimeoutHandle);
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    this._wakeLock?.then((wakeLock) => wakeLock.release());
  }

  private _deactivate(): void {
    this._active = false;
    if (this._addDevicesTimeoutHandle) {
      clearTimeout(this._addDevicesTimeoutHandle);
    }
    this._wakeLock?.then((wakeLock) => wakeLock.release());
  }

  private _subscribe(): void {
    if (!this.hass) {
      return;
    }
    this._active = true;
    const data: any = { type: "zha/devices/permit", duration: 254 };
    if (this._ieeeAddress) {
      data.ieee = this._ieeeAddress;
    }
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      data
    );
    this._addDevicesTimeoutHandle = setTimeout(
      () => this._deactivate(),
      254000
    );
    if ("wakeLock" in navigator) {
      this._wakeLock = navigator.wakeLock.request();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .discovery-text {
          width: 100%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .content {
          display: flex;
          flex-wrap: wrap;
          padding: 4px;
          justify-content: center;
        }
        .error {
          color: var(--error-color);
        }
        ha-spinner {
          margin: 20px;
        }
        .searching {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .card {
          margin: 8px;
        }
        .log {
          padding: 16px;
        }
        .toggle-help-icon {
          position: absolute;
          margin-top: 16px;
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          top: -6px;
          right: 0;
          inset-inline-end: 0;
          inset-inline-start: initial;
          color: var(--primary-color);
        }
        .search-button {
          margin-top: 16px;
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
        }
        .help-text {
          color: grey;
          padding-left: 16px;
          padding-inline-start: 16px;
          padding-inline-end: initial;
        }
        ha-textarea {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-add-devices-page": ZHAAddDevicesPage;
  }
}
