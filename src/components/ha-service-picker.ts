import { html, LitElement } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import { domainToName } from "../data/integration";
import { HomeAssistant } from "../types";
import "./ha-combo-box";

const rowRenderer: ComboBoxLitRenderer<{ service: string; name: string }> = (
  item
) =>
  html`<mwc-list-item twoline>
    <span>${item.name}</span>
    <span slot="secondary"
      >${item.name === item.service ? "" : item.service}</span
    >
  </mwc-list-item>`;

@customElement("ha-service-picker")
class HaServicePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public value?: string;

  @state() private _filter?: string;

  protected willUpdate() {
    if (!this.hasUpdated) {
      this.hass.loadBackendTranslation("services");
    }
  }

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
        .disabled=${this.disabled}
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
                this.hass.localize(
                  `component.${domain}.services.${service}.name`
                ) ||
                services[domain][service].name ||
                service
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-picker": HaServicePicker;
  }
}
