import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import { repeat } from "lit-html/directives/repeat";
import "@polymer/paper-tooltip/paper-tooltip";
import { HassEntityBase } from "home-assistant-js-websocket";
import "../../../components/entity/ha-state-icon";

import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import { EntityFilter } from "./types";
import computeStateName from "../../../common/entity/compute_state_name";
import {
  FilterFunc,
  generateFilter,
} from "../../../common/entity/entity_filter";

export class CloudExposedEntities extends LitElement {
  public hass?: HomeAssistant;
  public filter?: EntityFilter;
  public supportedDomains?: string[];
  private _filterFunc?: FilterFunc;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      filter: {},
      supportedDomains: {},
      _filterFunc: {},
    };
  }

  protected render(): TemplateResult {
    if (!this._filterFunc) {
      return html``;
    }

    const states: Array<[string, HassEntityBase]> = [];

    Object.keys(this.hass!.states).forEach((entityId) => {
      if (this._filterFunc!(entityId)) {
        const stateObj = this.hass!.states[entityId];
        states.push([computeStateName(stateObj), stateObj]);
      }
    });
    states.sort();

    return html`
      ${this.renderStyle()}
      ${repeat(
        states!,
        (stateInfo) => stateInfo[1].entity_id,
        (stateInfo) => html`
          <span>
            <ha-state-icon
              .stateObj='${stateInfo[1]}'
              @click='${this._handleMoreInfo}'
            ></ha-state-icon>
            <paper-tooltip
              position="bottom"
            >${stateInfo[0]}</paper-tooltip>
          </span>
        `
      )}
    `;
  }

  protected updated(changedProperties: PropertyValues) {
    if (
      changedProperties.has("filter") &&
      changedProperties.get("filter") !== this.filter
    ) {
      const filter = this.filter!;
      const filterFunc = generateFilter(
        filter.include_domains,
        filter.include_entities,
        filter.exclude_domains,
        filter.exclude_entities
      );
      const domains = new Set(this.supportedDomains);
      this._filterFunc = (entityId: string) => {
        const domain = entityId.split(".")[0];
        return domains.has(domain) && filterFunc(entityId);
      };
    }
  }

  private _handleMoreInfo(ev: MouseEvent) {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).stateObj.entity_id,
    });
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-state-icon {
          color: var(--primary-text-color);
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-exposed-entities": CloudExposedEntities;
  }
}

customElements.define("cloud-exposed-entities", CloudExposedEntities);
