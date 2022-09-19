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
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-card";
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

  @state() private _bindingOperationInProgress = false;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("device")) {
      this._bindTargetIndex = -1;
    }
    super.updated(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <ha-card class="content">
        <div class="command-picker">
          <ha-select
            label=${this.hass!.localize(
              "ui.panel.config.zha.device_binding.picker_label"
            )}
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
          <ha-progress-button
            @click=${this._onBindDevicesClick}
            .disabled=${!(this._deviceToBind && this.device) ||
            this._bindingOperationInProgress}
          >
            ${this.hass!.localize("ui.panel.config.zha.device_binding.bind")}
          </ha-progress-button>
          <ha-progress-button
            @click=${this._onUnbindDevicesClick}
            .disabled=${!(this._deviceToBind && this.device) ||
            this._bindingOperationInProgress}
          >
            ${this.hass!.localize("ui.panel.config.zha.device_binding.unbind")}
          </ha-progress-button>
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

  private async _onBindDevicesClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    if (this.hass && this._deviceToBind && this.device) {
      this._bindingOperationInProgress = true;
      button.progress = true;
      try {
        await bindDevices(this.hass, this.device.ieee, this._deviceToBind.ieee);
        button.actionSuccess();
      } catch (err: any) {
        button.actionError();
      } finally {
        this._bindingOperationInProgress = false;
        button.progress = false;
      }
    }
  }

  private async _onUnbindDevicesClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    if (this.hass && this._deviceToBind && this.device) {
      this._bindingOperationInProgress = true;
      button.progress = true;
      try {
        await unbindDevices(
          this.hass,
          this.device.ieee,
          this._deviceToBind.ieee
        );
        button.actionSuccess();
      } catch (err: any) {
        button.actionError();
      } finally {
        this._bindingOperationInProgress = false;
        button.progress = false;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .menu {
          width: 100%;
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
