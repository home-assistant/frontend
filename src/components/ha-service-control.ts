import { mdiHelpCircle } from "@mdi/js";
import {
  HassService,
  HassServices,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  fetchIntegrationManifest,
  IntegrationManifest,
} from "../data/integration";
import {
  expandAreaTarget,
  expandDeviceTarget,
  Selector,
} from "../data/selector";
import { ValueChangedEvent, HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";
import "./ha-checkbox";
import "./ha-icon-button";
import "./ha-selector/ha-selector";
import "./ha-service-picker";
import "./ha-settings-row";
import "./ha-yaml-editor";
import type { HaYamlEditor } from "./ha-yaml-editor";

const attributeFilter = (values: any[], attribute: any) => {
  if (typeof attribute === "object") {
    if (Array.isArray(attribute)) {
      return attribute.some((item) => values.includes(item));
    }
    return false;
  }
  return values.includes(attribute);
};

const showOptionalToggle = (field) =>
  field.selector &&
  !field.required &&
  !("boolean" in field.selector && field.default);

interface ExtHassService extends Omit<HassService, "fields"> {
  fields: {
    key: string;
    name?: string;
    description: string;
    required?: boolean;
    advanced?: boolean;
    default?: any;
    example?: any;
    filter?: {
      supported_features?: number[];
      attribute?: Record<string, any[]>;
    };
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

  @property({ type: Boolean }) public disabled = false;

  @property({ reflect: true, type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public showAdvanced?: boolean;

  @state() private _value!: this["value"];

  @state() private _checkedKeys = new Set();

  @state() private _manifest?: IntegrationManifest;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (!this.hasUpdated) {
      this.hass.loadBackendTranslation("services");
      this.hass.loadBackendTranslation("selector");
    }
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

    // Fetch the manifest if we have a service selected and the service domain changed.
    // If no service is selected, clear the manifest.
    if (this.value?.service) {
      if (
        !oldValue?.service ||
        computeDomain(this.value.service) !== computeDomain(oldValue.service)
      ) {
        this._fetchManifest(computeDomain(this.value?.service));
      }
    } else {
      this._manifest = undefined;
    }

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

    if (oldValue?.service !== this.value?.service) {
      let updatedDefaultValue = false;
      if (this._value && serviceData) {
        const loadDefaults = this.value && !("data" in this.value);
        // Set mandatory bools without a default value to false
        if (!this._value.data) {
          this._value.data = {};
        }
        serviceData.fields.forEach((field) => {
          if (
            field.selector &&
            field.required &&
            field.default === undefined &&
            "boolean" in field.selector &&
            this._value!.data![field.key] === undefined
          ) {
            updatedDefaultValue = true;
            this._value!.data![field.key] = false;
          }
          if (
            loadDefaults &&
            field.selector &&
            field.default !== undefined &&
            this._value!.data![field.key] === undefined
          ) {
            updatedDefaultValue = true;
            this._value!.data![field.key] = field.default;
          }
        });
      }
      if (updatedDefaultValue) {
        fireEvent(this, "value-changed", {
          value: {
            ...this._value,
          },
        });
      }
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

  private _filterFields = memoizeOne(
    (serviceData: ExtHassService | undefined, value: this["value"]) =>
      serviceData?.fields?.filter(
        (field) =>
          !field.filter ||
          this._filterField(serviceData.target, field.filter, value)
      )
  );

  private _filterField(
    target: ExtHassService["target"],
    filter: ExtHassService["fields"][number]["filter"],
    value: this["value"]
  ) {
    const targetSelector = target ? { target } : { target: {} };
    const targetEntities =
      ensureArray(
        value?.target?.entity_id || value?.data?.entity_id
      )?.slice() || [];
    const targetDevices =
      ensureArray(
        value?.target?.device_id || value?.data?.device_id
      )?.slice() || [];
    const targetAreas = ensureArray(
      value?.target?.area_id || value?.data?.area_id
    )?.slice();
    if (targetAreas) {
      targetAreas.forEach((areaId) => {
        const expanded = expandAreaTarget(
          this.hass,
          areaId,
          this.hass.devices,
          this.hass.entities,
          targetSelector
        );
        targetEntities.push(...expanded.entities);
        targetDevices.push(...expanded.devices);
      });
    }
    if (targetDevices.length) {
      targetDevices.forEach((deviceId) => {
        targetEntities.push(
          ...expandDeviceTarget(
            this.hass,
            deviceId,
            this.hass.entities,
            targetSelector
          ).entities
        );
      });
    }
    if (!targetEntities.length) {
      return false;
    }
    if (
      targetEntities.some((entityId) => {
        const entityState = this.hass.states[entityId];
        if (!entityState) {
          return false;
        }
        if (
          filter!.supported_features?.some((feature) =>
            supportsFeature(entityState, feature)
          )
        ) {
          return true;
        }
        if (
          filter!.attribute &&
          Object.entries(filter!.attribute).some(
            ([attribute, values]) =>
              attribute in entityState.attributes &&
              attributeFilter(values, entityState.attributes[attribute])
          )
        ) {
          return true;
        }
        return false;
      })
    ) {
      return true;
    }
    return false;
  }

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
        serviceData?.fields.some((field) => showOptionalToggle(field))
    );

    const filteredFields = this._filterFields(serviceData, this._value);

    const domain = this._value?.service
      ? computeDomain(this._value.service)
      : undefined;
    const serviceName = this._value?.service
      ? computeObjectId(this._value.service)
      : undefined;

    const description =
      (serviceName &&
        this.hass.localize(
          `component.${domain}.services.${serviceName}.description`
        )) ||
      serviceData?.description;

    return html`<ha-service-picker
        .hass=${this.hass}
        .value=${this._value?.service}
        .disabled=${this.disabled}
        @value-changed=${this._serviceChanged}
      ></ha-service-picker>
      <div class="description">
        ${description ? html`<p>${description}</p>` : ""}
        ${this._manifest
          ? html` <a
              href=${this._manifest.is_built_in
                ? documentationUrl(
                    this.hass,
                    `/integrations/${this._manifest.domain}`
                  )
                : this._manifest.documentation}
              title=${this.hass.localize(
                "ui.components.service-control.integration_doc"
              )}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                class="help-icon"
              ></ha-icon-button>
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
              .disabled=${this.disabled}
              @value-changed=${this._targetChanged}
              .value=${this._value?.target}
            ></ha-selector
          ></ha-settings-row>`
        : entityId
        ? html`<ha-entity-picker
            .hass=${this.hass}
            .disabled=${this.disabled}
            .value=${this._value?.data?.entity_id}
            .label=${this.hass.localize(
              `component.${domain}.services.${serviceName}.fields.entity_id.description`
            ) || entityId.description}
            @value-changed=${this._entityPicked}
            allow-custom-entity
          ></ha-entity-picker>`
        : ""}
      ${shouldRenderServiceDataYaml
        ? html`<ha-yaml-editor
            .hass=${this.hass}
            .label=${this.hass.localize("ui.components.service-control.data")}
            .name=${"data"}
            .readOnly=${this.disabled}
            .defaultValue=${this._value?.data}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>`
        : filteredFields?.map((dataField) => {
            const showOptional = showOptionalToggle(dataField);
            return dataField.selector &&
              (!dataField.advanced ||
                this.showAdvanced ||
                (this._value?.data &&
                  this._value.data[dataField.key] !== undefined))
              ? html`<ha-settings-row .narrow=${this.narrow}>
                  ${!showOptional
                    ? hasOptional
                      ? html`<div slot="prefix" class="checkbox-spacer"></div>`
                      : ""
                    : html`<ha-checkbox
                        .key=${dataField.key}
                        .checked=${this._checkedKeys.has(dataField.key) ||
                        (this._value?.data &&
                          this._value.data[dataField.key] !== undefined)}
                        .disabled=${this.disabled}
                        @change=${this._checkboxChanged}
                        slot="prefix"
                      ></ha-checkbox>`}
                  <span slot="heading"
                    >${this.hass.localize(
                      `component.${domain}.services.${serviceName}.fields.${dataField.key}.name`
                    ) ||
                    dataField.name ||
                    dataField.key}</span
                  >
                  <span slot="description"
                    >${this.hass.localize(
                      `component.${domain}.services.${serviceName}.fields.${dataField.key}.description`
                    ) || dataField?.description}</span
                  >
                  <ha-selector
                    .disabled=${this.disabled ||
                    (showOptional &&
                      !this._checkedKeys.has(dataField.key) &&
                      (!this._value?.data ||
                        this._value.data[dataField.key] === undefined))}
                    .hass=${this.hass}
                    .selector=${dataField.selector}
                    .key=${dataField.key}
                    @value-changed=${this._serviceDataChanged}
                    .value=${this._value?.data
                      ? this._value.data[dataField.key]
                      : undefined}
                    .placeholder=${dataField.default}
                    .localizeValue=${this._localizeValueCallback}
                  ></ha-selector>
                </ha-settings-row>`
              : "";
          })}`;
  }

  private _localizeValueCallback = (key: string) => {
    if (!this._value?.service) {
      return "";
    }
    return this.hass.localize(
      `component.${computeDomain(this._value.service)}.selector.${key}`
    );
  };

  private _checkboxChanged(ev) {
    const checked = ev.currentTarget.checked;
    const key = ev.currentTarget.key;
    let data;

    if (checked) {
      this._checkedKeys.add(key);
      const field = this._getServiceInfo(
        this._value?.service,
        this.hass.services
      )?.fields.find((_field) => _field.key === key);

      let defaultValue = field?.default;

      if (
        defaultValue == null &&
        field?.selector &&
        "constant" in field.selector
      ) {
        defaultValue = field.selector.constant?.value;
      }

      if (defaultValue != null) {
        data = {
          ...this._value?.data,
          [key]: defaultValue,
        };
      }
    } else {
      this._checkedKeys.delete(key);
      data = { ...this._value?.data };
      delete data[key];
    }
    if (data) {
      fireEvent(this, "value-changed", {
        value: {
          ...this._value,
          data,
        },
      });
    }
    this.requestUpdate("_checkedKeys");
  }

  private _serviceChanged(ev: ValueChangedEvent<string>) {
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

  private async _fetchManifest(integration: string) {
    this._manifest = undefined;
    try {
      this._manifest = await fetchIntegrationManifest(this.hass, integration);
    } catch (err: any) {
      // Ignore if loading manifest fails. Probably bad JSON in manifest
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-settings-row {
        padding: var(--service-control-padding, 0 16px);
      }
      ha-settings-row {
        --paper-time-input-justify-content: flex-end;
        --settings-row-content-width: 100%;
        --settings-row-prefix-display: contents;
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
