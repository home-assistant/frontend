import { html, internalProperty, LitElement, property } from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import "./ha-combo-box";

const rowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: { service: string; description: string } }
) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
    <style>
      paper-item {
        margin: -10px 0;
        padding: 0;
      }
    </style>
    <paper-item>
      <paper-item-body two-line="">
        <div class='name'>[[item.description]]</div>
        <div secondary>[[item.service]]</div>
      </paper-item-body>
    </paper-item>
    `;
  }

  root.querySelector(".name")!.textContent = model.item.description;
  root.querySelector("[secondary]")!.textContent = model.item.service;
};

class HaServicePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: string;

  @internalProperty() private _filter?: string;

  protected render() {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.hass.localize("ui.components.service-picker.service")}
        .filteredItems=${this._filteredServices(
          this.hass.services,
          this._filter
        )}
        .value=${this.value}
        .renderer=${rowRenderer}
        item-value-path="service"
        item-label-path="description"
        allow-custom-value
        @filter-changed=${this._filterChanged}
        @value-changed=${this._valueChanged}
      ></ha-combo-box>
    `;
  }

  private _services = memoizeOne((services: HomeAssistant["services"]): {
    service: string;
    description: string;
  }[] => {
    if (!services) {
      return [];
    }
    const result: { service: string; description: string }[] = [];

    Object.keys(services)
      .sort()
      .forEach((domain) => {
        const services_keys = Object.keys(services[domain]).sort();

        for (const service of services_keys) {
          result.push({
            service: `${domain}.${service}`,
            description:
              services[domain][service].description || `${domain}.${service}`,
          });
        }
      });

    return result;
  });

  private _filteredServices = memoizeOne(
    (services: HomeAssistant["services"], filter?: string) => {
      if (!services) {
        return [];
      }
      const processedServices = this._services(services);

      if (!filter) {
        return processedServices;
      }
      return processedServices.filter(
        (service) =>
          service.service.toLowerCase().includes(filter) ||
          service.description.toLowerCase().includes(filter)
      );
    }
  );

  private _filterChanged(ev: CustomEvent): void {
    this._filter = ev.detail.value.toLowerCase();
  }

  private _valueChanged(ev) {
    this.value = ev.detail.value;
    fireEvent(this, "change");
    fireEvent(this, "value-changed", { value: this.value });
  }
}

customElements.define("ha-service-picker", HaServicePicker);

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-picker": HaServicePicker;
  }
}
