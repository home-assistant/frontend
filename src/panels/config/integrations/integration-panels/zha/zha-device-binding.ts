import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
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
import { bindDevices, unbindDevices, ZHADevice } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ItemSelectedEvent } from "./types";

@customElement("zha-device-binding-control")
export class ZHADeviceBindingControl extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public device?: ZHADevice;

  @state() private _bindTargetIndex = -1;

  @state() private bindableDevices: ZHADevice[] = [];

  @state() private _deviceToBind?: ZHADevice;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
      this._bindTargetIndex = -1;
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
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
        <div class="card-actions">
          <mwc-button
            @click=${this._onBindDevicesClick}
            .disabled=${!(this._deviceToBind && this.device)}
            >Bind</mwc-button
          >
          <mwc-button
            @click=${this._onUnbindDevicesClick}
            .disabled=${!(this._deviceToBind && this.device)}
            >Unbind</mwc-button
          >
        </div>
      </ha-card>
    `;
  }

  private _bindTargetIndexChanged(event: ItemSelectedEvent): void {
    this._bindTargetIndex = Number(event.target!.value);
    this._deviceToBind =
      this._bindTargetIndex === -1
        ? undefined
        : this.bindableDevices[this._bindTargetIndex];
  }

  private async _onBindDevicesClick(): Promise<void> {
    if (this.hass && this._deviceToBind && this.device) {
      await bindDevices(this.hass, this.device.ieee, this._deviceToBind.ieee);
    }
  }

  private async _onUnbindDevicesClick(): Promise<void> {
    if (this.hass && this._deviceToBind && this.device) {
      await unbindDevices(this.hass, this.device.ieee, this._deviceToBind.ieee);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .menu {
          width: 100%;
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

        .header {
          flex-grow: 1;
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
