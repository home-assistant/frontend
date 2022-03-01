import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiHelpCircle } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-select";
import "../../../../../components/ha-service-description";
import { bindDevices, unbindDevices, ZHADevice } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../../../ha-config-section";
import { ItemSelectedEvent } from "./types";

@customElement("zha-device-binding-control")
export class ZHADeviceBindingControl extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public selectedDevice?: ZHADevice;

  @state() private _showHelp = false;

  @state() private _bindTargetIndex = -1;

  @state() private bindableDevices: ZHADevice[] = [];

  @state() private _deviceToBind?: ZHADevice;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedDevice")) {
      this._bindTargetIndex = -1;
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide=${this.isWide}>
        <div class="header" slot="header">
          <span>Device Binding</span>
          <ha-icon-button
            class="toggle-help-icon"
            @click=${this._onHelpTap}
            .path=${mdiHelpCircle}
            .label=${this.hass!.localize("ui.common.help")}
          >
          </ha-icon-button>
        </div>
        <span slot="introduction">Bind and unbind devices.</span>

        <ha-card class="content">
          <div class="command-picker">
            <ha-select
              label="Bindable Devices"
              class="menu"
              .value=${String(this._bindTargetIndex)}
              @selected=${this._bindTargetIndexChanged}
              @closed=${stopPropagation}
              fixedMenuPosition
              naturalMenuWidth
            >
              ${this.bindableDevices.map(
                (device, idx) => html`
                  <mwc-list-item .value=${String(idx)}>
                    ${device.user_given_name
                      ? device.user_given_name
                      : device.name}
                  </mwc-list-item>
                `
              )}
            </ha-select>
          </div>
          ${this._showHelp
            ? html`
                <div class="helpText">
                  Select a device to issue a bind command.
                </div>
              `
            : ""}
          <div class="card-actions">
            <mwc-button
              @click=${this._onBindDevicesClick}
              .disabled=${!(this._deviceToBind && this.selectedDevice)}
              >Bind</mwc-button
            >
            ${this._showHelp
              ? html` <div class="helpText">Bind devices.</div> `
              : ""}
            <mwc-button
              @click=${this._onUnbindDevicesClick}
              .disabled=${!(this._deviceToBind && this.selectedDevice)}
              >Unbind</mwc-button
            >
            ${this._showHelp
              ? html` <div class="helpText">Unbind devices.</div> `
              : ""}
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _bindTargetIndexChanged(event: ItemSelectedEvent): void {
    this._bindTargetIndex = Number(event.target!.value);
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .menu {
          width: 100%;
        }

        .content {
          margin-top: 24px;
        }

        ha-card {
          max-width: 680px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .command-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .helpText {
          color: grey;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .header {
          flex-grow: 1;
        }

        .toggle-help-icon {
          float: right;
          top: -6px;
          right: 0;
          padding-right: 0px;
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
    "zha-device-binding-control": ZHADeviceBindingControl;
  }
}
