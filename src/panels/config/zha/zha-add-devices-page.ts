import "../../../components/ha-service-description";
import "../../../components/ha-textarea";
import "../../../layouts/hass-subpage";
import "./zha-device-card";
import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { ZHADevice } from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";

@customElement("zha-add-devices-page")
class ZHAAddDevicesPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public route?: Route;
  @property() private _error?: string;
  @property() private _discoveredDevices: ZHADevice[] = [];
  @property() private _formattedEvents: string = "";
  @property() private _active: boolean = false;
  @property() private _showHelp: boolean = false;
  private _ieeeAddress?: string;
  private _addDevicesTimeoutHandle: any = undefined;
  private _subscribed?: Promise<() => Promise<void>>;

  public connectedCallback(): void {
    super.connectedCallback();
    this.route && this.route.path && this.route.path !== ""
      ? (this._ieeeAddress = this.route.path.substring(1))
      : (this._ieeeAddress = undefined);
    this._subscribe();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
    this._error = undefined;
    this._discoveredDevices = [];
    this._formattedEvents = "";
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header="${this.hass!.localize(
          "ui.panel.config.zha.add_device_page.header"
        )}"
      >
        ${this._active
          ? html`
              <h2>
                <paper-spinner
                  ?active="${this._active}"
                  alt="Searching"
                ></paper-spinner>
                ${this.hass!.localize(
                  "ui.panel.config.zha.add_device_page.spinner"
                )}
              </h2>
            `
          : html`
              <div class="card-actions">
                <mwc-button @click=${this._subscribe} class="search-button">
                  ${this.hass!.localize(
                    "ui.panel.config.zha.add_device_page.search_again"
                  )}
                </mwc-button>
                <paper-icon-button
                  class="toggle-help-icon"
                  @click="${this._onHelpTap}"
                  icon="hass:help-circle"
                ></paper-icon-button>
                ${this._showHelp
                  ? html`
                      <ha-service-description
                        .hass="${this.hass}"
                        domain="zha"
                        service="permit"
                        class="help-text"
                      />
                    `
                  : ""}
              </div>
            `}
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : ""}
        <div class="content-header"></div>
        <div class="content">
          ${this._discoveredDevices.length < 1
            ? html`
                <div class="discovery-text">
                  <h4>
                    ${this.hass!.localize(
                      "ui.panel.config.zha.add_device_page.discovery_text"
                    )}
                  </h4>
                </div>
              `
            : html`
                ${this._discoveredDevices.map(
                  (device) => html`
                    <zha-device-card
                      class="card"
                      .hass=${this.hass}
                      .device=${device}
                      .narrow=${!this.isWide}
                      .showHelp=${this._showHelp}
                      .showActions=${!this._active}
                      .showEntityDetail=${false}
                    ></zha-device-card>
                  `
                )}
              `}
        </div>
        <ha-textarea class="events" value="${this._formattedEvents}">
        </ha-textarea>
      </hass-subpage>
    `;
  }

  private _handleMessage(message: any): void {
    if (message.type === "log_output") {
      this._formattedEvents += message.log_entry.message + "\n";
      if (this.shadowRoot) {
        const textArea = this.shadowRoot.querySelector("ha-textarea");
        if (textArea) {
          textArea.scrollTop = textArea.scrollHeight;
        }
      }
    }
    if (message.type && message.type === "device_fully_initialized") {
      this._discoveredDevices.push(message.device_info);
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
  }

  private _subscribe(): void {
    const data: any = { type: "zha/devices/permit" };
    if (this._ieeeAddress) {
      data.ieee = this._ieeeAddress;
    }
    this._subscribed = this.hass!.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      data
    );
    this._active = true;
    this._addDevicesTimeoutHandle = setTimeout(
      () => this._unsubscribe(),
      75000
    );
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .discovery-text,
        .content-header {
          margin: 16px;
        }
        .content {
          border-top: 1px solid var(--light-primary-color);
          min-height: 500px;
          display: flex;
          flex-wrap: wrap;
          padding: 4px;
          justify-content: left;
          overflow: scroll;
        }
        .error {
          color: var(--google-red-500);
        }
        paper-spinner {
          display: none;
          margin-right: 20px;
          margin-left: 16px;
        }
        paper-spinner[active] {
          display: block;
          float: left;
          margin-right: 20px;
          margin-left: 16px;
        }
        .card {
          margin-left: 16px;
          margin-right: 16px;
          margin-bottom: 0px;
          margin-top: 10px;
        }
        .events {
          margin: 16px;
          border-top: 1px solid var(--light-primary-color);
          padding-top: 16px;
          min-height: 200px;
          max-height: 200px;
          overflow: scroll;
        }
        .toggle-help-icon {
          position: absolute;
          margin-top: 16px;
          margin-right: 16px;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }
        ha-service-description {
          margin-top: 16px;
          margin-left: 16px;
          display: block;
          color: grey;
        }
        .search-button {
          margin-top: 16px;
          margin-left: 16px;
        }
        .help-text {
          color: grey;
          padding-left: 16px;
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
