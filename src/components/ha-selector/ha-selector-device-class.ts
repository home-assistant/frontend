import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { DeviceClassSelector } from "../../data/selector";
import { computeDeviceClassForUnit } from "../../data/sensor/unit_of_measurement";
import "../ha-device-class-picker";

@customElement("ha-selector-device_class")
export class HaDeviceClassSelector extends LitElement {
  @property({ attribute: false }) public selector!: DeviceClassSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_unit_of_measurement?: string;
  };

  protected render() {
    return html`
      <ha-device-class-picker
        .domain=${this.selector.device_class?.domain}
        .value=${this.value}
        .multiple=${this.selector.device_class?.multiple ?? false}
        .unit=${this.context?.filter_unit_of_measurement}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-device-class-picker>
    `;
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (
      !changedProps.has("context") ||
      this.value ||
      this.selector.device_class?.multiple
    ) {
      return;
    }

    // Preselect only when the unit changes, so a form that opens with a unit
    // and a device class the user cleared stay without a device class
    const oldContext = changedProps.get("context");
    const unit = this.context?.filter_unit_of_measurement;
    if (
      oldContext === undefined ||
      oldContext.filter_unit_of_measurement === unit
    ) {
      return;
    }

    // Preselect the only device class of the unit
    const deviceClass = computeDeviceClassForUnit(
      this.selector.device_class?.domain,
      unit
    );
    if (deviceClass) {
      fireEvent(this, "value-changed", { value: deviceClass });
    }
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
