import { html, internalProperty, LitElement, property } from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import { domainToName } from "../data/integration";
import { HomeAssistant } from "../types";
import "./ha-combo-box";

const rowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: { service: string; name: string } }
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
        <div class='name'>[[item.name]]</div>
        <div secondary>[[item.service]]</div>
      </paper-item-body>
    </paper-item>
    `;
  }

  root.querySelector(".name")!.textContent = model.item.name;
  root.querySelector("[secondary]")!.textContent =
    model.item.name === model.item.service ? "" : model.item.service;
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
          this.hass.localize,
          this.hass.services,
          this._filter
        )}
        .value=${this.value}
        .renderer=${rowRenderer}
        item-value-path="service"
        item-label-path="name"
        allow-custom-value
        @filter-changed=${this._filterChanged}
        @value-changed=${this._valueChanged}
      ></ha-combo-box>
    `;
  }

  private _services = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"]
    ): {
      service: string;
      name: string;
    }[] => {
      if (!services) {
        return [];
      }
      const result: { service: string; name: string }[] = [];

      Object.keys(services)
        .sort()
        .forEach((domain) => {
          const services_keys = Object.keys(services[domain]).sort();

          for (const service of services_keys) {
            result.push({
              service: `${domain}.${service}`,
              name: `${domainToName(localize, domain)}: ${
                services[domain][service].name || service
              }`,
            });
          }
        });

      return result;
    }
  );

  private _filteredServices = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      filter?: string
    ) => {
      if (!services) {
        return [];
      }
      const processedServices = this._services(localize, services);

      if (!filter) {
        return processedServices;
      }
      return processedServices.filter(
        (service) =>
          service.service.toLowerCase().includes(filter) ||
          service.name?.toLowerCase().includes(filter)
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
