import { HassService, HassServiceTarget } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { ENTITY_COMPONENT_DOMAINS } from "../data/entity";
import { Selector } from "../data/selector";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import "./ha-selector/ha-selector";
import "./ha-service-picker";
import "./ha-settings-row";
import "./ha-yaml-editor";
import "./ha-checkbox";
import type { HaYamlEditor } from "./ha-yaml-editor";

interface ExtHassService extends Omit<HassService, "fields"> {
  fields: {
    key: string;
    name?: string;
    description: string;
    required?: boolean;
    advanced?: boolean;
    default?: any;
    example?: any;
    selector?: Selector;
  }[];
}

@customElement("ha-service-control")
export class HaServiceControl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: {
    service: string;
    target?: HassServiceTarget;
    data?: Record<string, any>;
  };

  @property({ reflect: true, type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public showAdvanced?: boolean;

  @internalProperty() private _serviceData?: ExtHassService;

  @internalProperty() private _checkedKeys = new Set();

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("value")) {
      return;
    }
    const oldValue = changedProperties.get("value") as
      | undefined
      | this["value"];

    if (oldValue?.service !== this.value?.service) {
      this._checkedKeys = new Set();
    }

    this._serviceData = this.value?.service
      ? this._getServiceInfo(this.value.service)
      : undefined;

    if (
      this._serviceData &&
      "target" in this._serviceData &&
      (this.value?.data?.entity_id ||
        this.value?.data?.area_id ||
        this.value?.data?.device_id)
    ) {
      const target = {
        ...this.value.target,
      };

      if (this.value.data.entity_id && !this.value.target?.entity_id) {
        target.entity_id = this.value.data.entity_id;
      }
      if (this.value.data.area_id && !this.value.target?.area_id) {
        target.area_id = this.value.data.area_id;
      }
      if (this.value.data.device_id && !this.value.target?.device_id) {
        target.device_id = this.value.data.device_id;
      }

      this.value = {
        ...this.value,
        target,
        data: { ...this.value.data },
      };

      delete this.value.data!.entity_id;
      delete this.value.data!.device_id;
      delete this.value.data!.area_id;
    }

    if (this.value?.data) {
      const yamlEditor = this._yamlEditor;
      if (yamlEditor && yamlEditor.value !== this.value.data) {
        yamlEditor.setValue(this.value.data);
      }
    }
  }

  private _domainFilter = memoizeOne((service: string) => {
    const domain = computeDomain(service);
    return ENTITY_COMPONENT_DOMAINS.includes(domain) ? [domain] : null;
  });

  private _getServiceInfo = memoizeOne((service: string):
    | ExtHassService
    | undefined => {
    if (!service) {
      return undefined;
    }
    const domain = computeDomain(service);
    const serviceName = computeObjectId(service);
    const serviceDomains = this.hass.services;
    if (!(domain in serviceDomains)) {
      return undefined;
    }
    if (!(serviceName in serviceDomains[domain])) {
      return undefined;
    }

    const fields = Object.entries(
      serviceDomains[domain][serviceName].fields
    ).map(([key, value]) => {
      return {
        key,
        ...value,
        selector: value.selector as Selector | undefined,
      };
    });
    return {
      ...serviceDomains[domain][serviceName],
      fields,
    };
  });

  protected render() {
    const legacy =
      this._serviceData?.fields.length &&
      !this._serviceData.fields.some((field) => field.selector);

    const entityId =
      legacy &&
      this._serviceData?.fields.find((field) => field.key === "entity_id");

    return html`<ha-service-picker
        .hass=${this.hass}
        .value=${this.value?.service}
        @value-changed=${this._serviceChanged}
      ></ha-service-picker>
      ${this._serviceData && "target" in this._serviceData
        ? html`<ha-settings-row .narrow=${this.narrow}>
            <div slot="prefix">
              <ha-checkbox checked disabled></ha-checkbox
              ><paper-tooltip animation-delay="0"
                >This field is required</paper-tooltip
              >
            </div>
            <span slot="heading">Target</span>
            <span slot="description">What should this service target</span
            ><ha-selector
              .hass=${this.hass}
              .selector=${this._serviceData.target
                ? { target: this._serviceData.target }
                : {
                    target: {
                      entity: { domain: computeDomain(this.value!.service) },
                    },
                  }}
              @value-changed=${this._targetChanged}
              .value=${this.value?.target}
            ></ha-selector
          ></ha-settings-row>`
        : entityId
        ? html`<ha-entity-picker
            .hass=${this.hass}
            .value=${this.value?.data?.entity_id}
            .label=${entityId.description}
            .includeDomains=${this._domainFilter(this.value!.service)}
            @value-changed=${this._entityPicked}
            allow-custom-entity
          ></ha-entity-picker>`
        : ""}
      ${legacy
        ? html`<ha-yaml-editor
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.service.service_data"
            )}
            .name=${"data"}
            .defaultValue=${this.value?.data}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>`
        : this._serviceData?.fields.map((dataField) =>
            dataField.selector && (!dataField.advanced || this.showAdvanced)
              ? html`<ha-settings-row .narrow=${this.narrow}>
                  ${dataField.required
                    ? html`
                        <div slot="prefix">
                          <ha-checkbox checked disabled></ha-checkbox
                          ><paper-tooltip animation-delay="0"
                            >This field is required</paper-tooltip
                          >
                        </div>
                      `
                    : html`<ha-checkbox
                        .key=${dataField.key}
                        .checked=${this._checkedKeys.has(dataField.key) ||
                        (this.value?.data &&
                          this.value.data[dataField.key] !== undefined)}
                        @change=${this._checkboxChanged}
                        slot="prefix"
                      ></ha-checkbox>`}
                  <span slot="heading">${dataField.name || dataField.key}</span>
                  <span slot="description">${dataField?.description}</span
                  ><ha-selector
                    .disabled=${!dataField.required &&
                    !this._checkedKeys.has(dataField.key) &&
                    (!this.value?.data ||
                      this.value.data[dataField.key] === undefined)}
                    .hass=${this.hass}
                    .selector=${dataField.selector}
                    .key=${dataField.key}
                    .placeholder=${dataField.example}
                    @value-changed=${this._serviceDataChanged}
                    .value=${this.value?.data &&
                    this.value.data[dataField.key] !== undefined
                      ? this.value.data[dataField.key]
                      : dataField.default}
                  ></ha-selector
                ></ha-settings-row>`
              : ""
          )} `;
  }

  private _checkboxChanged(ev) {
    const checked = ev.currentTarget.checked;
    const key = ev.currentTarget.key;
    if (checked) {
      this._checkedKeys.add(key);
    } else {
      this._checkedKeys.delete(key);
      const data = { ...this.value?.data };

      delete data[key];

      fireEvent(this, "value-changed", {
        value: {
          ...this.value,
          data,
        },
      });
    }
    this.requestUpdate("_checkedKeys");
  }

  private _serviceChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    if (ev.detail.value === this.value?.service) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { service: ev.detail.value || "" },
    });
  }

  private _entityPicked(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (this.value?.data?.entity_id === newValue) {
      return;
    }
    let value;
    if (!newValue && this.value?.data) {
      value = { ...this.value };
      delete value.data.entity_id;
    } else {
      value = {
        ...this.value,
        data: { ...this.value?.data, entity_id: ev.detail.value },
      };
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _targetChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (this.value?.target === newValue) {
      return;
    }
    let value;
    if (!newValue) {
      value = { ...this.value };
      delete value.target;
    } else {
      value = { ...this.value, target: ev.detail.value };
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _serviceDataChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const key = (ev.currentTarget as any).key;
    const value = ev.detail.value;
    if (this.value?.data && this.value.data[key] === value) {
      return;
    }

    const data = { ...this.value?.data, [key]: value };

    if (value === "" || value === undefined) {
      delete data[key];
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        data,
      },
    });
  }

  private _dataChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        data: ev.detail.value,
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-settings-row {
        padding: 0;
      }
      ha-settings-row {
        --paper-time-input-justify-content: flex-end;
      }
      :host(:not([narrow])) ha-settings-row paper-input {
        width: 60%;
      }
      :host(:not([narrow])) ha-settings-row ha-selector {
        width: 60%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-control": HaServiceControl;
  }
}
