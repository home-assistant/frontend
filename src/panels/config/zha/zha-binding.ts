import {
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-card/paper-card";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import { ZHADevice, bindDevices, unbindDevices } from "../../../data/zha";
import { haStyle } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { ItemSelectedEvent } from "./types";

export class ZHABindingControl extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() public selectedDevice?: ZHADevice;
  @property() private _showHelp: boolean;
  @property() private _bindTargetIndex: number;
  @property() private bindableDevices: ZHADevice[];
  private _deviceToBind?: ZHADevice;

  constructor() {
    super();
    this._showHelp = false;
    this._bindTargetIndex = -1;
    this.bindableDevices = [];
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._bindTargetIndex = -1;
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div class="sectionHeader" slot="header">
          <span>Device Binding</span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          >
          </paper-icon-button>
        </div>
        <span slot="introduction">Bind and unbind devices.</span>

        <paper-card class="content">
          <div class="command-picker">
            <paper-dropdown-menu label="Bindable Devices" class="flex">
              <paper-listbox
                slot="dropdown-content"
                .selected="${this._bindTargetIndex}"
                @iron-select="${this._bindTargetIndexChanged}"
              >
                ${this.bindableDevices.map(
                  (device) => html`
                    <paper-item>${device.name}</paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._showHelp
            ? html`
                <div class="helpText">
                  Select a device to issue a bind command.
                </div>
              `
            : ""}
          <div class="card-actions">
            <mwc-button @click="${this._onBindDevicesClick}">Bind</mwc-button>
            ${this._showHelp
              ? html`
                  <div class="helpText">
                    Bind devices.
                  </div>
                `
              : ""}
            <mwc-button @click="${this._onUnbindDevicesClick}"
              >Unbind</mwc-button
            >
            ${this._showHelp
              ? html`
                  <div class="helpText">
                    Unbind devices.
                  </div>
                `
              : ""}
          </div>
        </paper-card>
      </ha-config-section>
    `;
  }

  private _bindTargetIndexChanged(event: ItemSelectedEvent): void {
    this._bindTargetIndex = event.target!.selected;
    this._deviceToBind =
      this._bindTargetIndex === -1
        ? undefined
        : this.bindableDevices[this._bindTargetIndex];
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private async _onBindDevicesClick(): Promise<void> {
    if (this.hass && this._deviceToBind && this.selectedDevice) {
      await bindDevices(
        this.hass,
        this.selectedDevice.ieee,
        this._deviceToBind.ieee
      );
    }
  }

  private async _onUnbindDevicesClick(): Promise<void> {
    if (this.hass && this._deviceToBind && this.selectedDevice) {
      await unbindDevices(
        this.hass,
        this.selectedDevice.ieee,
        this._deviceToBind.ieee
      );
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }

        .content {
          margin-top: 24px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--google-red-500);
        }

        .command-picker {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .sectionHeader {
          position: relative;
        }

        .helpText {
          color: grey;
          padding: 16px;
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-binding-control": ZHABindingControl;
  }
}

customElements.define("zha-binding-control", ZHABindingControl);
