import "@material/mwc-button";
import "../../../../../components/ha-icon-button";
import "@polymer/paper-spinner/paper-spinner";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import "../../../../../components/ha-service-description";
import "@polymer/paper-input/paper-textarea";
import { ZHADevice } from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../../types";
import "./zha-device-card";
import { zhaTabs } from "./zha-config-dashboard";
import { IronAutogrowTextareaElement } from "@polymer/iron-autogrow-textarea";

@customElement("zha-add-devices-page")
class ZHAAddDevicesPage extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public isWide?: boolean;

  @property() public route?: Route;

  @property() private _error?: string;

  @property() private _discoveredDevices: ZHADevice[] = [];

  @property() private _formattedEvents = "";

  @property() private _active = false;

  @property() private _showHelp = false;

  @property() private _showLogs = false;

  private _ieeeAddress?: string;

  private _addDevicesTimeoutHandle: any = undefined;

  private _subscribed?: Promise<() => Promise<void>>;

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
    this._discoveredDevices = [];
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
        .route=${this.route}
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
                <paper-spinner active alt="Searching"></paper-spinner>
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
          ${this._discoveredDevices.length < 1
            ? html`
                <div class="discovery-text">
                  <h4>
                    ${this.hass!.localize(
                      "ui.panel.config.zha.add_device_page.pairing_mode"
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
                ${this._discoveredDevices.map(
                  (device) => html`
                    <zha-device-card
                      class="card"
                      .hass=${this.hass}
                      .device=${device}
                      .narrow=${this.narrow}
                      .showHelp=${this._showHelp}
                    ></zha-device-card>
                  `
                )}
              `}
        </div>
        ${this._showLogs
          ? html`<paper-textarea
              readonly
              max-rows="10"
              class="log"
              value="${this._formattedEvents}"
            >
            </paper-textarea>`
          : ""}
      </hass-tabs-subpage>
    `;
  }

  private _toggleLogs() {
    this._showLogs = !this._showLogs;
  }

  private _handleMessage(message: any): void {
    if (message.type === "log_output") {
      this._formattedEvents += message.log_entry.message + "\n";
      if (this.shadowRoot) {
        const paperTextArea = this.shadowRoot.querySelector("paper-textarea");
        if (paperTextArea) {
          const textArea = (paperTextArea.inputElement as IronAutogrowTextareaElement)
            .textarea;
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
    if (!this.hass) {
      return;
    }
    this._active = true;
    const data: any = { type: "zha/devices/permit" };
    if (this._ieeeAddress) {
      data.ieee = this._ieeeAddress;
    }
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      data
    );
    this._addDevicesTimeoutHandle = setTimeout(
      () => this._unsubscribe(),
      120000
    );
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .discovery-text {
          width: 100%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .content {
          display: flex;
          flex-wrap: wrap;
          padding: 4px;
          justify-content: center;
        }
        .error {
          color: var(--google-red-500);
        }
        paper-spinner {
          padding: 20px;
        }
        .searching {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
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
