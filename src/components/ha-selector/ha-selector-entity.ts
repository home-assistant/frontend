import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import { EntitySelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../entity/ha-entities-picker";
import "../entity/ha-entity-picker";

@customElement("ha-selector-entity")
export class HaEntitySelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: EntitySelector;

  @state() private _entitySources?: EntitySources;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    if (!this.selector.entity.multiple) {
      return html`<ha-entity-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .includeEntities=${this.selector.entity.include_entities}
        .excludeEntities=${this.selector.entity.exclude_entities}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        .required=${this.required}
        allow-custom-entity
      ></ha-entity-picker>`;
    }

    return html`
      ${this.label ? html`<label>${this.label}</label>` : ""}
      <ha-entities-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .includeEntities=${this.selector.entity.include_entities}
        .excludeEntities=${this.selector.entity.exclude_entities}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-entities-picker>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      changedProps.has("selector") &&
      this.selector.entity.integration &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    const {
      domain: filterDomain,
      device_class: filterDeviceClass,
      integration: filterIntegration,
    } = this.selector.entity;

    if (filterDomain) {
      const entityDomain = computeStateDomain(entity);
      if (
        Array.isArray(filterDomain)
          ? !filterDomain.includes(entityDomain)
          : entityDomain !== filterDomain
      ) {
        return false;
      }
    }
    if (
      filterDeviceClass &&
      entity.attributes.device_class !== filterDeviceClass
    ) {
      return false;
    }
    if (
      filterIntegration &&
      this._entitySources?.[entity.entity_id]?.domain !== filterIntegration
    ) {
      return false;
    }
    return true;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
