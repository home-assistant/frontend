import "@polymer/paper-input/paper-input";
import {
  customElement,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";
import { html } from "lit-html";
import memoizeOne from "memoize-one";
import { any, assert, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { computeObjectId } from "../../../../../common/entity/compute_object_id";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-service-picker";
import "../../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../../components/ha-yaml-editor";
import { ServiceAction } from "../../../../../data/script";
import type { PolymerChangedEvent } from "../../../../../polymer-types";
import type { HomeAssistant } from "../../../../../types";
import { EntityIdOrAll } from "../../../../../common/structs/is-entity-id";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";

const actionStruct = object({
  service: optional(string()),
  entity_id: optional(EntityIdOrAll),
  data: optional(any()),
});

@customElement("ha-automation-action-service")
export class HaServiceAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: ServiceAction;

  @query("ha-yaml-editor", true) private _yamlEditor?: HaYamlEditor;

  private _actionData?: ServiceAction["data"];

  public static get defaultConfig() {
    return { service: "", data: {} };
  }

  private _domain = memoizeOne((service: string) => [computeDomain(service)]);

  private _getServiceData = memoizeOne((service: string) => {
    if (!service) {
      return [];
    }
    const domain = computeDomain(service);
    const serviceName = computeObjectId(service);
    const serviceDomains = this.hass.services;
    if (!(domain in serviceDomains)) {
      return [];
    }
    if (!(serviceName in serviceDomains[domain])) {
      return [];
    }

    const fields = serviceDomains[domain][serviceName].fields;
    return Object.keys(fields).map((field) => {
      return { key: field, ...fields[field] };
    });
  });

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    try {
      assert(this.action, actionStruct);
    } catch (error) {
      fireEvent(this, "ui-mode-not-available", error);
    }
    if (this._actionData && this._actionData !== this.action.data) {
      if (this._yamlEditor) {
        this._yamlEditor.setValue(this.action.data);
      }
    }
    this._actionData = this.action.data;
  }

  protected render() {
    const { service, data, entity_id } = this.action;

    const serviceData = this._getServiceData(service);
    const entity = serviceData.find((attr) => attr.key === "entity_id");

    return html`
      <ha-service-picker
        .hass=${this.hass}
        .value=${service}
        @value-changed=${this._serviceChanged}
      ></ha-service-picker>
      ${entity
        ? html`
            <ha-entity-picker
              .hass=${this.hass}
              .value=${entity_id}
              .label=${entity.description}
              @value-changed=${this._entityPicked}
              .includeDomains=${this._domain(service)}
              allow-custom-entity
            ></ha-entity-picker>
          `
        : ""}
      <ha-yaml-editor
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.service.service_data"
        )}
        .name=${"data"}
        .defaultValue=${data}
        @value-changed=${this._dataChanged}
      ></ha-yaml-editor>
    `;
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._actionData = ev.detail.value;
    handleChangeEvent(this, ev);
  }

  private _serviceChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    if (ev.detail.value === this.action.service) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.action, service: ev.detail.value },
    });
  }

  private _entityPicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, entity_id: ev.detail.value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-service": HaServiceAction;
  }
}
