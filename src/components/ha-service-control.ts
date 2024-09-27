import { mdiHelpCircle } from "@mdi/js";
import {
  HassService,
  HassServices,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { supportsFeature } from "../common/entity/supports-feature";
import { nestedArrayMove } from "../common/util/array-move";
import {
  fetchIntegrationManifest,
  IntegrationManifest,
} from "../data/integration";
import {
  areaMeetsTargetSelector,
  deviceMeetsTargetSelector,
  entityMeetsTargetSelector,
  expandAreaTarget,
  expandDeviceTarget,
  expandFloorTarget,
  expandLabelTarget,
  Selector,
  TargetSelector,
} from "../data/selector";
import { HomeAssistant, ValueChangedEvent } from "../types";
import { documentationUrl } from "../util/documentation-url";
import "./ha-checkbox";
import "./ha-icon-button";
import "./ha-selector/ha-selector";
import "./ha-service-picker";
import "./ha-settings-row";
import "./ha-yaml-editor";
import type { HaYamlEditor } from "./ha-yaml-editor";
import "./ha-service-section-icon";

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
  fields: Array<
    Omit<HassService["fields"][string], "selector"> & {
      key: string;
      selector?: Selector;
      fields?: Record<string, Omit<HassService["fields"][string], "selector">>;
      collapsed?: boolean;
    }
  >;
  hasSelector: string[];
}

@customElement("ha-service-control")
export class HaServiceControl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: {
    action: string;
    target?: HassServiceTarget;
    data?: Record<string, any>;
  };

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public showAdvanced = false;

  @property({ type: Boolean, reflect: true }) public hidePicker = false;

  @property({ type: Boolean }) public hideDescription = false;

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

    if (oldValue?.action !== this.value?.action) {
      this._checkedKeys = new Set();
    }

    const serviceData = this._getServiceInfo(
      this.value?.action,
      this.hass.services
    );

    // Fetch the manifest if we have a service selected and the service domain changed.
    // If no service is selected, clear the manifest.
    if (this.value?.action) {
      if (
        !oldValue?.action ||
        computeDomain(this.value.action) !== computeDomain(oldValue.action)
      ) {
        this._fetchManifest(computeDomain(this.value?.action));
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

    if (oldValue?.action !== this.value?.action) {
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

      const hasSelector: string[] = [];
      fields.forEach((field) => {
        if ((field as any).fields) {
          Object.entries((field as any).fields).forEach(([key, subField]) => {
            if ((subField as any).selector) {
              hasSelector.push(key);
            }
          });
        } else if (field.selector) {
          hasSelector.push(field.key);
        }
      });

      return {
        ...serviceDomains[domain][serviceName],
        fields,
        hasSelector,
      };
    }
  );

  private _getTargetedEntities = memoizeOne((target, value) => {
    const targetSelector = target ? { target } : { target: {} };
    const targetEntities =
      ensureArray(
        value?.target?.entity_id || value?.data?.entity_id
      )?.slice() || [];
    const targetDevices =
      ensureArray(
        value?.target?.device_id || value?.data?.device_id
      )?.slice() || [];
    const targetAreas =
      ensureArray(value?.target?.area_id || value?.data?.area_id)?.slice() ||
      [];
    const targetFloors = ensureArray(
      value?.target?.floor_id || value?.data?.floor_id
    )?.slice();
    const targetLabels = ensureArray(
      value?.target?.label_id || value?.data?.label_id
    )?.slice();
    if (targetLabels) {
      targetLabels.forEach((labelId) => {
        const expanded = expandLabelTarget(
          this.hass,
          labelId,
          this.hass.areas,
          this.hass.devices,
          this.hass.entities,
          targetSelector
        );
        targetDevices.push(...expanded.devices);
        targetEntities.push(...expanded.entities);
        targetAreas.push(...expanded.areas);
      });
    }
    if (targetFloors) {
      targetFloors.forEach((floorId) => {
        const expanded = expandFloorTarget(
          this.hass,
          floorId,
          this.hass.areas,
          targetSelector
        );
        targetAreas.push(...expanded.areas);
      });
    }
    if (targetAreas.length) {
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
    return targetEntities;
  });

  private _filterField(
    filter: ExtHassService["fields"][number]["filter"],
    targetEntities: string[]
  ) {
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

  private _targetSelector = memoizeOne(
    (targetSelector: TargetSelector | null | undefined) =>
      targetSelector ? { target: { ...targetSelector } } : { target: {} }
  );

  protected render() {
    const serviceData = this._getServiceInfo(
      this._value?.action,
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

    const targetEntities = this._getTargetedEntities(
      serviceData?.target,
      this._value
    );

    const domain = this._value?.action
      ? computeDomain(this._value.action)
      : undefined;
    const serviceName = this._value?.action
      ? computeObjectId(this._value.action)
      : undefined;

    const description =
      (serviceName &&
        this.hass.localize(
          `component.${domain}.services.${serviceName}.description`
        )) ||
      serviceData?.description;

    return html`${this.hidePicker
      ? nothing
      : html`<ha-service-picker
          .hass=${this.hass}
          .value=${this._value?.action}
          .disabled=${this.disabled}
          @value-changed=${this._serviceChanged}
        ></ha-service-picker>`}
    ${this.hideDescription
      ? nothing
      : html`
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
              : nothing}
          </div>
        `}
    ${serviceData && "target" in serviceData
      ? html`<ha-settings-row .narrow=${this.narrow}>
          ${hasOptional
            ? html`<div slot="prefix" class="checkbox-spacer"></div>`
            : ""}
          <span slot="heading"
            >${this.hass.localize("ui.components.service-control.target")}</span
          >
          <span slot="description"
            >${this.hass.localize(
              "ui.components.service-control.target_secondary"
            )}</span
          ><ha-selector
            .hass=${this.hass}
            .selector=${this._targetSelector(
              serviceData.target as TargetSelector
            )}
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
          .label=${this.hass.localize(
            "ui.components.service-control.action_data"
          )}
          .name=${"data"}
          .readOnly=${this.disabled}
          .defaultValue=${this._value?.data}
          @value-changed=${this._dataChanged}
        ></ha-yaml-editor>`
      : serviceData?.fields.map((dataField) =>
          dataField.fields
            ? html`<ha-expansion-panel
                leftChevron
                .expanded=${!dataField.collapsed}
                .header=${this.hass.localize(
                  `component.${domain}.services.${serviceName}.sections.${dataField.key}.name`
                ) ||
                dataField.name ||
                dataField.key}
                .secondary=${this._getSectionDescription(
                  dataField,
                  domain,
                  serviceName
                )}
              >
                <ha-service-section-icon
                  slot="icons"
                  .hass=${this.hass}
                  .service=${this._value!.action}
                  .section=${dataField.key}
                ></ha-service-section-icon>
                ${Object.entries(dataField.fields).map(([key, field]) =>
                  this._renderField(
                    { key, ...field },
                    hasOptional,
                    domain,
                    serviceName,
                    targetEntities
                  )
                )}
              </ha-expansion-panel>`
            : this._renderField(
                dataField,
                hasOptional,
                domain,
                serviceName,
                targetEntities
              )
        )} `;
  }

  private _getSectionDescription(
    dataField: ExtHassService["fields"][number],
    domain: string | undefined,
    serviceName: string | undefined
  ) {
    return this.hass!.localize(
      `component.${domain}.services.${serviceName}.sections.${dataField.key}.description`
    );
  }

  private _renderField = (
    dataField: ExtHassService["fields"][number],
    hasOptional: boolean,
    domain: string | undefined,
    serviceName: string | undefined,
    targetEntities: string[]
  ) => {
    if (
      dataField.filter &&
      !this._filterField(dataField.filter, targetEntities)
    ) {
      return nothing;
    }

    const selector = dataField?.selector ?? { text: undefined };
    const type = Object.keys(selector)[0];
    const enhancedSelector = ["action", "condition", "trigger"].includes(type)
      ? {
          [type]: {
            ...selector[type],
            path: [dataField.key],
          },
        }
      : selector;

    const showOptional = showOptionalToggle(dataField);

    return dataField.selector &&
      (!dataField.advanced ||
        this.showAdvanced ||
        (this._value?.data && this._value.data[dataField.key] !== undefined))
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
            .selector=${enhancedSelector}
            .key=${dataField.key}
            @value-changed=${this._serviceDataChanged}
            .value=${this._value?.data
              ? this._value.data[dataField.key]
              : undefined}
            .placeholder=${dataField.default}
            .localizeValue=${this._localizeValueCallback}
            @item-moved=${this._itemMoved}
          ></ha-selector>
        </ha-settings-row>`
      : "";
  };

  private _localizeValueCallback = (key: string) => {
    if (!this._value?.action) {
      return "";
    }
    return this.hass.localize(
      `component.${computeDomain(this._value.action)}.selector.${key}`
    );
  };

  private _checkboxChanged(ev) {
    const checked = ev.currentTarget.checked;
    const key = ev.currentTarget.key;
    let data;

    if (checked) {
      this._checkedKeys.add(key);
      const field = this._getServiceInfo(
        this._value?.action,
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

      if (
        defaultValue == null &&
        field?.selector &&
        "boolean" in field.selector
      ) {
        defaultValue = false;
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
    if (ev.detail.value === this._value?.action) {
      return;
    }

    const newService = ev.detail.value || "";
    let target: HassServiceTarget | undefined;

    if (newService) {
      const serviceData = this._getServiceInfo(newService, this.hass.services);
      const currentTarget = this._value?.target;
      if (currentTarget && serviceData?.target) {
        const targetSelector = { target: { ...serviceData.target } };
        let targetEntities =
          ensureArray(
            currentTarget.entity_id || this._value!.data?.entity_id
          )?.slice() || [];
        let targetDevices =
          ensureArray(
            currentTarget.device_id || this._value!.data?.device_id
          )?.slice() || [];
        let targetAreas =
          ensureArray(
            currentTarget.area_id || this._value!.data?.area_id
          )?.slice() || [];
        if (targetAreas.length) {
          targetAreas = targetAreas.filter((area) =>
            areaMeetsTargetSelector(
              this.hass,
              this.hass.entities,
              this.hass.devices,
              area,
              targetSelector
            )
          );
        }
        if (targetDevices.length) {
          targetDevices = targetDevices.filter((device) =>
            deviceMeetsTargetSelector(
              this.hass,
              Object.values(this.hass.entities),
              this.hass.devices[device],
              targetSelector
            )
          );
        }
        if (targetEntities.length) {
          targetEntities = targetEntities.filter((entity) =>
            entityMeetsTargetSelector(this.hass.states[entity], targetSelector)
          );
        }
        target = {
          ...(targetEntities.length ? { entity_id: targetEntities } : {}),
          ...(targetDevices.length ? { device_id: targetDevices } : {}),
          ...(targetAreas.length ? { area_id: targetAreas } : {}),
        };
      }
    }

    const value = {
      action: newService,
      target,
    };

    fireEvent(this, "value-changed", {
      value,
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
      ((!this._value?.data || !(key in this._value.data)) &&
        (value === "" || value === undefined))
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

  private _itemMoved(ev) {
    ev.stopPropagation();
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;

    const data = this.value?.data ?? {};

    const newData = nestedArrayMove(data, oldIndex, newIndex, oldPath, newPath);

    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        data: newData,
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
      :host([hidePicker]) p {
        padding-top: 0;
      }
      .checkbox-spacer {
        width: 32px;
      }
      ha-checkbox {
        margin-left: -16px;
        margin-inline-start: -16px;
        margin-inline-end: initial;
      }
      .help-icon {
        color: var(--secondary-text-color);
      }
      .description {
        justify-content: space-between;
        display: flex;
        align-items: center;
        padding-right: 2px;
        padding-inline-end: 2px;
        padding-inline-start: initial;
      }
      .description p {
        direction: ltr;
      }
      ha-expansion-panel {
        --ha-card-border-radius: 0;
        --expansion-panel-summary-padding: 0 16px;
        --expansion-panel-content-padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-service-control": HaServiceControl;
  }
}
