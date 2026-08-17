import type { PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import type { SelectSelector, DeviceClassSelector } from "../../data/selector";
import { HaSelectSelector } from "./ha-selector-select";

@customElement("ha-selector-device_class")
export class HaDeviceClassSelector extends HaSelectSelector {
  private domain?: string;

  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);

    this.localizeValue = this._localizeValue;

    if (this.selector && !("select" in this.selector)) {
      const selector = (this.selector as unknown as DeviceClassSelector)
        ?.device_class;

      if (selector) {
        this.domain = selector.domain;
        this.selector = this._getSelectSelector(selector);
      }
    }
  }

  private _localizeValue = (key: string): string => {
    // We want the last part of the key
    const elements: string[] = key.split(".");
    const componentKey: string = elements[elements.length - 1];
    return (
      this.hass?.localize?.(
        `component.${this.domain}.entity_component.${componentKey}.name`
      ) ?? ""
    );
  };

  private _getSelectSelector(
    selector?: DeviceClassSelector["device_class"]
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
    "ha-selector-device_class": HaDeviceClassSelector;
  }
}
