import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { ValueChangedEvent, HomeAssistant } from "../../types";
import "./ha-device-picker";
import type {
  HaDevicePickerDeviceFilterFunc,
  HaDevicePickerEntityFilterFunc,
} from "./ha-device-picker";

@customElement("ha-devices-picker")
class HaDevicesPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string[];

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  /**
   * Show entities from specific domains.
   * @type {string}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  @property({ attribute: "picked-device-label" })
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  public pickedDeviceLabel?: string;

  @property({ attribute: "pick-device-label" }) public pickDeviceLabel?: string;

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: HaDevicePickerEntityFilterFunc;

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const currentDevices = this._currentDevices;
    return html`
      ${currentDevices.map(
        (entityId) => html`
          <div>
            <ha-device-picker
              allow-custom-entity
              .curValue=${entityId}
              .hass=${this.hass}
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .includeDomains=${this.includeDomains}
              .excludeDomains=${this.excludeDomains}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .value=${entityId}
              .label=${this.pickedDeviceLabel}
              .disabled=${this.disabled}
              @value-changed=${this._deviceChanged}
            ></ha-device-picker>
          </div>
        `
      )}
      <div>
        <ha-device-picker
          allow-custom-entity
          .hass=${this.hass}
          .helper=${this.helper}
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityFilter}
          .includeDomains=${this.includeDomains}
          .excludeDomains=${this.excludeDomains}
          .excludeDevices=${currentDevices}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .label=${this.pickDeviceLabel}
          .disabled=${this.disabled}
          .required=${this.required && !currentDevices.length}
          @value-changed=${this._addDevice}
        ></ha-device-picker>
      </div>
    `;
  }

  private get _currentDevices() {
    return this.value || [];
  }

  private async _updateDevices(devices) {
    fireEvent(this, "value-changed", {
      value: devices,
    });

    this.value = devices;
  }

  private _deviceChanged(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    const curValue = (event.currentTarget as any).curValue;
    const newValue = event.detail.value;
    if (newValue === curValue) {
      return;
    }
    if (newValue === undefined) {
      this._updateDevices(
        this._currentDevices.filter((dev) => dev !== curValue)
      );
    } else {
      this._updateDevices(
        this._currentDevices.map((dev) => (dev === curValue ? newValue : dev))
      );
    }
  }

  private async _addDevice(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    const toAdd = event.detail.value;
    (event.currentTarget as any).value = "";
    if (!toAdd) {
      return;
    }
    const currentDevices = this._currentDevices;
    if (currentDevices.includes(toAdd)) {
      return;
    }

    this._updateDevices([...currentDevices, toAdd]);
  }

  static override styles = css`
    div {
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-devices-picker": HaDevicesPicker;
  }
}
