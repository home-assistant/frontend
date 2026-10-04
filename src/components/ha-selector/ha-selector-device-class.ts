import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { DeviceClassSelector } from "../../data/selector";
import "../ha-device-class-picker";

@customElement("ha-selector-device_class")
export class HaDeviceClassSelector extends LitElement {
  @property({ attribute: false }) public selector!: DeviceClassSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-device-class-picker
        .domain=${this.selector.device_class?.domain}
        .value=${this.value}
        .multiple=${this.selector.device_class?.multiple ?? false}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-device-class-picker>
    `;
  }

  static styles = css`
    ha-device-class-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-device_class": HaDeviceClassSelector;
  }
}
