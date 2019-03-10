import {
  LitElement,
  html,
  css,
  property,
  CSSResult,
  TemplateResult,
  customElement,
} from "lit-element";
import "@polymer/paper-spinner/paper-spinner";
import "../../../layouts/hass-subpage";
import "./zha-device-card";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ZHADevice } from "../../../data/zha";

@customElement("zha-add-devices-page")
class ZHAAddDevicesPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _error?: string;
  @property() private _discoveredDevices: ZHADevice[] = [];
  @property() private _formattedEvents: string = "";
  @property() private _active: boolean = false;
  private _addDevicesTimeoutHandle: any = undefined;
  private _subscribed?: Promise<() => Promise<void>>;

  public connectedCallback(): void {
    super.connectedCallback();
    this._active = true;
    this._subscribed = this.hass!.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      { type: "zha/devices/add" }
    );
    this._addDevicesTimeoutHandle = setTimeout(
      () => this._unsubscribe(),
      60000
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
    this._error = undefined;
    this._discoveredDevices = [];
    this._formattedEvents = "";
  }

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage header="Zigbee Home Automation - Add Devices">
        <h2>
          <paper-spinner
            ?active="${this._active}"
            alt="Searching"
          ></paper-spinner>
          Searching for ZHA Zigbee devices...
        </h2>
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : ""}
        <div class="events">
          <ha-textarea value="${this._formattedEvents}"> </ha-textarea>
        </div>
        <div class="content">
          <h4>
            Discovered devices:
          </h4>
          ${this._discoveredDevices.map(
            (device) => html`
              <zha-device-card
                class="card"
                .hass="${this.hass}"
                .device="${device}"
                .narrow="${true}"
              ></zha-device-card>
            `
          )}
        </div>
      </hass-subpage>
    `;
  }

  private _handleMessage(message: any): void {
    if (message.type === "log_output") {
      this._formattedEvents += message.log_entry.message + "\n";
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .content {
          min-height: 325px;
          margin: 16px;
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
          box-sizing: border-box;
          display: flex;
          flex: 1 0 300px;
          min-width: 0;
          max-width: 600px;
          max-height: 450px;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }
        .events {
          margin: 16px;
          border-top: 1px solid var(--light-primary-color);
          padding-top: 16px;
          min-height: 275px;
          max-height: 275px;
          overflow: scroll;
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
