import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-service-picker";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-yaml-editor";

import { LitElement, property, customElement } from "lit-element";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { html } from "lit-html";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { computeObjectId } from "../../../../../common/entity/compute_object_id";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ServiceAction } from "../../../../../data/script";

@customElement("ha-automation-action-service")
export class HaServiceAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: ServiceAction;

  public static get defaultConfig() {
    return { service: "", data: {} };
  }

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

  public render() {
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
              .includeDomains=${[computeDomain(service)]}
              allow-custom-entity
            ></ha-entity-picker>
          `
        : ""}
      <ha-yaml-editor
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.service.service_data"
        )}
        .name=${"data"}
        .value=${data}
        @value-changed=${this._valueChanged}
      ></ha-yaml-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
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
