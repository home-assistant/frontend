import { mdiRoomService } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { isValidServiceId } from "../common/entity/valid_service_id";
import type { LocalizeFunc } from "../common/translations/localize";
import { getServiceIcons } from "../data/icons";
import { domainToName } from "../data/integration";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-service-icon";

interface ServiceComboBoxItem extends PickerComboBoxItem {
  domain_name?: string;
}

@customElement("ha-service-picker")
class HaServicePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public value?: string;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  protected firstUpdated(props) {
    super.firstUpdated(props);
    this.hass.loadBackendTranslation("services");
    getServiceIcons(this.hass);
  }

  private _rowRenderer: ComboBoxLitRenderer<ServiceComboBoxItem> = (
    item
  ) => html`
    <ha-combo-box-item type="button">
      <ha-service-icon
        slot="start"
        .hass=${this.hass}
        .service=${item.id}
      ></ha-service-icon>
      <span slot="headline">${item.primary}</span>
      <span slot="supporting-text">${item.secondary}</span>
      ${item.domain_name
        ? html`
            <div slot="trailing-supporting-text" class="domain">
              ${item.domain_name}
            </div>
          `
        : nothing}
    </ha-combo-box-item>
  `;

  private _valueRenderer: PickerValueRenderer = (value) => {
    const serviceId = value;
    const [domain, service] = serviceId.split(".");

    if (!this.hass.services[domain]?.[service]) {
      return html`
        <ha-svg-icon slot="start" .path=${mdiRoomService}></ha-svg-icon>
        <span slot="headline">${value}</span>
      `;
    }

    const serviceName =
      this.hass.localize(`component.${domain}.services.${service}.name`) ||
      this.hass.services[domain][service].name ||
      service;

    const serviceDescription =
      this.hass.localize(
        `component.${domain}.services.${service}.description`
      ) || this.hass.services[domain][service].description;

    return html`
      <ha-service-icon
        slot="start"
        .hass=${this.hass}
        .service=${serviceId}
      ></ha-service-icon>
      <span slot="headline">${serviceName}</span>
      ${serviceDescription
        ? html` <span slot="supporting-text">${serviceDescription}</span> `
        : nothing}
    `;
  };

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.service-picker.action");

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        allow-custom-value
        .notFoundLabel=${this.hass.localize(
          "ui.components.service-picker.no_match"
        )}
        .label=${this.label}
        .placeholder=${placeholder}
        .value=${this.value}
        .getItems=${this._getItems}
        .rowRenderer=${this._rowRenderer}
        .valueRenderer=${this._valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _getItems = () =>
    this._services(this.hass.localize, this.hass.services);

  private _services = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"]
    ): ServiceComboBoxItem[] => {
      if (!services) {
        return [];
      }
      const items: ServiceComboBoxItem[] = [];

      Object.keys(services)
        .sort()
        .forEach((domain) => {
          const services_keys = Object.keys(services[domain]).sort();

          for (const service of services_keys) {
            const serviceId = `${domain}.${service}`;
            const domainName = domainToName(localize, domain);

            const name =
              this.hass.localize(
                `component.${domain}.services.${service}.name`
              ) ||
              services[domain][service].name ||
              service;

            const description =
              this.hass.localize(
                `component.${domain}.services.${service}.description`
              ) || services[domain][service].description;

            items.push({
              id: serviceId,
              primary: name,
              secondary: description,
              domain_name: domainName,
              search_labels: [serviceId, domainName, name, description].filter(
                Boolean
              ),
              sorting_label: serviceId,
            });
          }
        });

      return items;
    }
  );

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (!isValidServiceId(value)) {
      return;
    }

    this._setValue(value);
  }

  private _setValue(value: string | undefined) {
    this.value = value;

    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-picker": HaServicePicker;
  }
}
