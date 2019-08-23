import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-listbox/paper-listbox";
import memoizeOne from "memoize-one";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import { compare } from "../../common/string/compare";

class HaDevicePicker extends LitElement {
  public hass?: HomeAssistant;
  @property() public label?: string;
  @property() public value?: string;
  @property() public devices?: DeviceRegistryEntry[];
  private _unsubDevices?: UnsubscribeFunc;

  private _sortedDevices = memoizeOne((devices?: DeviceRegistryEntry[]) => {
    if (!devices || devices.length === 1) {
      return devices || [];
    }
    const sorted = [...devices];
    sorted.sort((a, b) => compare(a.name || "", b.name || ""));
    return sorted;
  });

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubDevices) {
      this._unsubDevices();
      this._unsubDevices = undefined;
    }
  }

  protected render(): TemplateResult | void {
    return html`
      <paper-dropdown-menu-light .label=${this.label}>
        <paper-listbox
          slot="dropdown-content"
          .selected=${this._value}
          attr-for-selected="data-device-id"
          @iron-select=${this._deviceChanged}
        >
          <paper-item data-device-id="">
            No device
          </paper-item>
          ${this._sortedDevices(this.devices).map(
            (device) => html`
              <paper-item data-device-id=${device.id}>
                ${device.name_by_user || device.name}
              </paper-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this.devices === undefined) {
      this._unsubDevices = subscribeDeviceRegistry(
        this.hass!.connection!,
        (devices) => {
          this.devices = devices;
        }
      );
    }
  }

  private _deviceChanged(ev) {
    const newValue = ev.detail.item.dataset.deviceId;

    if (newValue !== this._value) {
      this.value = newValue;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
      }
      paper-dropdown-menu-light {
        display: block;
      }
      paper-listbox {
        min-width: 200px;
      }
      paper-item {
        cursor: pointer;
      }
    `;
  }
}

customElements.define("ha-device-picker", HaDevicePicker);
