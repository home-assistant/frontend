import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/device/ha-device-picker";
import type { HaDevicePickerDeviceFilterFunc } from "../../../../../components/device/ha-device-picker";
import type { ZHADevice } from "../../../../../data/zha";
import { bindDevices, unbindDevices } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";

@customElement("zha-device-binding-control")
export class ZHADeviceBindingControl extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false }) public bindableDevices: ZHADevice[] = [];

  @state() private _deviceToBind?: ZHADevice;

  @state() private _bindingOperationInProgress = false;

  protected updated(changedProperties: PropertyValues<this>): void {
    const oldDevice = changedProperties.get("device");
    const deviceChanged =
      changedProperties.has("device") && this.device?.ieee !== oldDevice?.ieee;

    if (deviceChanged || changedProperties.has("bindableDevices")) {
      this._deviceToBind = undefined;
    }
    super.updated(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <div class="command-picker">
          <ha-device-picker
            label=${this.hass!.localize(
              "ui.panel.config.zha.device_binding.picker_label"
            )}
            .value=${this._deviceToBind?.device_reg_id}
            .deviceFilter=${this._filterBindableDevices}
            @value-changed=${this._bindTargetChanged}
          >
          </ha-device-picker>
        </div>
        <div class="card-actions">
          <ha-progress-button
            @click=${this._onUnbindDevicesClick}
            .disabled=${
              !(this._deviceToBind && this.device) ||
              this._bindingOperationInProgress
            }
            variant="danger"
            appearance="plain"
          >
            ${this.hass!.localize("ui.panel.config.zha.device_binding.unbind")}
          </ha-progress-button>
          <ha-progress-button
            @click=${this._onBindDevicesClick}
            .disabled=${
              !(this._deviceToBind && this.device) ||
              this._bindingOperationInProgress
            }
          >
            ${this.hass!.localize("ui.panel.config.zha.device_binding.bind")}
          </ha-progress-button>
        </div>
      </div>
    `;
  }

  private _filterBindableDevices: HaDevicePickerDeviceFilterFunc = (device) =>
    this.bindableDevices.some(
      (bindableDevice) => bindableDevice.device_reg_id === device.id
    );

  private _bindTargetChanged(event: ValueChangedEvent<string>): void {
    event.stopPropagation();
    this._deviceToBind = this.bindableDevices.find(
      (device) => device.device_reg_id === event.detail.value
    );
  }

  private async _onBindDevicesClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    if (this.hass && this._deviceToBind && this.device) {
      this._bindingOperationInProgress = true;
      button.progress = true;
      try {
        await bindDevices(this.hass, this.device.ieee, this._deviceToBind.ieee);
        button.actionSuccess();
      } catch (_err: any) {
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
      } catch (_err: any) {
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
        ha-device-picker {
          display: block;
          width: 100%;
        }

        :host {
          display: block;
        }

        .command-picker {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .card-actions {
          display: flex;
          border-top: 1px solid var(--divider-color);
          padding: var(--ha-space-2);
          justify-content: flex-end;
          gap: var(--ha-space-2);
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
