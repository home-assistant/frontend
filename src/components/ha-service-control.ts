import { mdiHelpCircle } from "@mdi/js";
import {
  HassService,
  HassServices,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { Selector } from "../data/selector";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";
import "./ha-checkbox";
import "./ha-selector/ha-selector";
import "./ha-service-picker";
import "./ha-settings-row";
import "./ha-yaml-editor";
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
  hasSelector: string[];
}

@customElement("ha-service-control")
export class HaServiceControl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: {
    service: string;
    target?: HassServiceTarget;
    data?: Record<string, any>;
  };

  @state() private _value!: this["value"];

  @property({ reflect: true, type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public showAdvanced?: boolean;

  @state() private _checkedKeys = new Set();

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected updated(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("value")) {
      return;
    }
    const oldValue = changedProperties.get("value") as
      | undefined
      | this["value"];

    if (oldValue?.service !== this.value?.service) {
      this._checkedKeys = new Set();
    }

    const serviceData = this._getServiceInfo(
      this.value?.service,
      this.hass.services
    );

    if (
      serviceData &&
      "target" in serviceData &&
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

      this._value = {
        ...this.value,
        target,
        data: { ...this.value.data },
      };

      delete this._value.data!.entity_id;
      delete this._value.data!.device_id;
      delete this._value.data!.area_id;
    } else {
      this._value = this.value;
    }

    if (this._value?.data) {
      const yamlEditor = this._yamlEditor;
      if (yamlEditor && yamlEditor.value !== this._value.data) {
        yamlEditor.setValue(this._value.data);
      }
    }
  }

  private _getServiceInfo = memoizeOne(
    (
      service?: string,
      serviceDomains?: HassServices
    ): ExtHassService | undefined => {
      if (!service || !serviceDomains) {
        return undefined;
      }
      const domain = computeDomain(service);
      const serviceName = computeObjectId(service);
      if (!(domain in serviceDomains)) {
        return undefined;
      }
      if (!(serviceName in serviceDomains[domain])) {
        return undefined;
      }

      const fields = Object.entries(
        serviceDomains[domain][serviceName].fields
      ).map(([key, value]) => ({
        key,
        ...value,
        selector: value.selector as Selector | undefined,
      }));
      return {
        ...serviceDomains[domain][serviceName],
        fields,
        hasSelector: fields.length
          ? fields.filter((field) => field.selector).map((field) => field.key)
          : [],
      };
    }
  );

  protected render() {
    const serviceData = this._getServiceInfo(
      this._value?.service,
      this.hass.services
    );

    const shouldRenderServiceDataYaml =
      (serviceData?.fields.length && !serviceData.hasSelector.length) ||
      (serviceData &&
        Object.keys(this._value?.data || {}).some(
          (key) => !serviceData!.hasSelector.includes(key)
        ));

    const entityId =
      shouldRenderServiceDataYaml &&
      serviceData?.fields.find((field) => field.key === "entity_id");

    const hasOptional = Boolean(
      !shouldRenderServiceDataYaml &&
        serviceData?.fields.some((field) => field.selector && !field.required)
    );

    return html`<ha-service-picker
        .hass=${this.hass}
        .value=${this._value?.service}
        @value-changed=${this._serviceChanged}
      ></ha-service-picker>
      <div class="description">
        <p>${serviceData?.description}</p>
        ${this.value?.service
          ? html` <a
              href="${documentationUrl(
                this.hass,
                "/integrations/" + computeDomain(this.value?.service)
              )}"
              title="${this.hass.localize(
                "ui.components.service-control.integration_doc"
              )}"
              target="_blank"
              rel="noreferrer"
            >
              <mwc-icon-button>
                <ha-svg-icon
                  path=${mdiHelpCircle}
                  class="help-icon"
                ></ha-svg-icon>
              </mwc-icon-button>
            </a>`
          : ""}
      </div>
      ${serviceData && "target" in serviceData
        ? html`<ha-settings-row .narrow=${this.narrow}>
            ${hasOptional
              ? html`<div slot="prefix" class="checkbox-spacer"></div>`
              : ""}
            <span slot="heading"
              >${this.hass.localize(
                "ui.components.service-control.target"
              )}</span
            >
            <span slot="description"
              >${this.hass.localize(
                "ui.components.service-control.target_description"
              )}</span
            ><ha-selector
              .hass=${this.hass}
              .selector=${serviceData.target
                ? { target: serviceData.target }
                : { target: {} }}
              @value-changed=${this._targetChanged}
              .value=${this._value?.target}
            ></ha-selector
          ></ha-settings-row>`
        : entityId
        ? html`<ha-entity-picker
            .hass=${this.hass}
            .value=${this._value?.data?.entity_id}
            .label=${entityId.description}
            @value-changed=${this._entityPicked}
            allow-custom-entity
          ></ha-entity-picker>`
        : ""}
      ${shouldRenderServiceDataYaml
        ? html`<ha-yaml-editor
            .label=${this.hass.localize(
              "ui.components.service-control.service_data"
            )}
            .name=${"data"}
            .defaultValue=${this._value?.data}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>`
        : serviceData?.fields.map((dataField) =>
            dataField.selector &&
            (!dataField.advanced ||
              this.showAdvanced ||
              (this._value?.data &&
                this._value.data[dataField.key] !== undefined))
              ? html`<ha-settings-row .narrow=${this.narrow}>
                  ${dataField.required
                    ? hasOptional
                      ? html`<div slot="prefix" class="checkbox-spacer"></div>`
                      : ""
                    : html`<ha-checkbox
                        .key=${dataField.key}
                        .checked=${this._checkedKeys.has(dataField.key) ||
                        (this._value?.data &&
                          this._value.data[dataField.key] !== undefined)}
                        @change=${this._checkboxChanged}
                        slot="prefix"
                      ></ha-checkbox>`}
                  <span slot="heading">${dataField.name || dataField.key}</span>
                  <span slot="description">${dataField?.description}</span
                  ><ha-selector
                    .disabled=${!dataField.required &&
                    !this._checkedKeys.has(dataField.key) &&
                    (!this._value?.data ||
                      this._value.data[dataField.key] === undefined)}
                    .hass=${this.hass}
                    .selector=${dataField.selector}
                    .key=${dataField.key}
                    @value-changed=${this._serviceDataChanged}
                    .value=${this._value?.data &&
                    this._value.data[dataField.key] !== undefined
                      ? this._value.data[dataField.key]
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
      const data = { ...this._value?.data };

      delete data[key];

      fireEvent(this, "value-changed", {
        value: {
          ...this._value,
          data,
        },
      });
    }
    this.requestUpdate("_checkedKeys");
  }

  private _serviceChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    if (ev.detail.value === this._value?.service) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { service: ev.detail.value || "" },
    });
  }

  private _entityPicked(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (this._value?.data?.entity_id === newValue) {
      return;
    }
    let value;
    if (!newValue && this._value?.data) {
      value = { ...this._value };
      delete value.data.entity_id;
    } else {
      value = {
        ...this._value,
        data: { ...this._value?.data, entity_id: ev.detail.value },
      };
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _targetChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (this._value?.target === newValue) {
      return;
    }
    let value;
    if (!newValue) {
      value = { ...this._value };
      delete value.target;
    } else {
      value = { ...this._value, target: ev.detail.value };
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _serviceDataChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const key = (ev.currentTarget as any).key;
    const value = ev.detail.value;
    if (
      this._value?.data?.[key] === value ||
      (!this._value?.data?.[key] && (value === "" || value === undefined))
    ) {
      return;
    }

    const data = { ...this._value?.data, [key]: value };

    if (value === "" || value === undefined) {
      delete data[key];
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this._value,
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
        ...this._value,
        data: ev.detail.value,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-settings-row {
        padding: var(--service-control-padding, 0 16px);
      }
      ha-settings-row {
        --paper-time-input-justify-content: flex-end;
        border-top: var(
          --service-control-items-border-top,
          1px solid var(--divider-color)
        );
      }
      ha-service-picker,
      ha-entity-picker,
      ha-yaml-editor {
        display: block;
        margin: var(--service-control-padding, 0 16px);
      }
      ha-yaml-editor {
        padding: 16px 0;
      }
      p {
        margin: var(--service-control-padding, 0 16px);
        padding: 16px 0;
      }
      :host(:not([narrow])) ha-settings-row paper-input {
        width: 60%;
      }
      :host(:not([narrow])) ha-settings-row ha-selector {
        width: 60%;
      }
      .checkbox-spacer {
        width: 32px;
      }
      ha-checkbox {
        margin-left: -16px;
      }
      .help-icon {
        color: var(--secondary-text-color);
      }
      .description {
        justify-content: space-between;
        display: flex;
        align-items: center;
        padding-right: 2px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-control": HaServiceControl;
  }
}
