import type { PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import type {
  SelectSelector,
  SensorDeviceClassSelector,
} from "../../data/selector";
import { HaSelectSelector } from "./ha-selector-select";

@customElement("ha-selector-sensor_device_class")
export class HaSensorDeviceClassSelector extends HaSelectSelector {
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);

    this.localizeValue = this._localizeValue;

    if (changedProperties.has("hass") && this.hass) {
      this.hass
        .loadBackendTranslation("selector", "sensor")
        .then(() => this.requestUpdate());
    }

    if (this.selector && !("select" in this.selector)) {
      const selector = (this.selector as unknown as SensorDeviceClassSelector)
        ?.sensor_device_class;

      if (selector) {
        this.selector = this._getSelectSelector(selector);
      }
    }
  }

  private _localizeValue = (key: string): string =>
    this.hass?.localize?.(`component.sensor.selector.${key}`) ?? "";

  private _getSelectSelector(
    selector?: SensorDeviceClassSelector["sensor_device_class"]
  ): SelectSelector {
    return {
      select: selector
        ? {
            ...selector,
            options: selector.options || [],
            translation_key: "device_class",
          }
        : null,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-sensor_device_class": HaSensorDeviceClassSelector;
  }
}
