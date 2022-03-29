import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { subscribeEntityRegistry } from "../../data/entity_registry";
import { EntitySelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";
import "../entity/ha-entities-picker";
import "../entity/ha-entity-picker";

@customElement("ha-selector-entity")
export class HaEntitySelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: EntitySelector;

  @state() private _entityPlaformLookup?: Record<string, string>;

  @property() public value?: any;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    if (!this.selector.entity.multiple) {
      return html`<ha-entity-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
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
        .entityFilter=${this._filterEntities}
        .includeEntities=${this.selector.entity.include_entities}
        .excludeEntities=${this.selector.entity.exclude_entities}
        .required=${this.required}
      ></ha-entities-picker>
    `;
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        const entityLookup = {};
        for (const confEnt of entities) {
          if (!confEnt.platform) {
            continue;
          }
          entityLookup[confEnt.entity_id] = confEnt.platform;
        }
        this._entityPlaformLookup = entityLookup;
      }),
    ];
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (this.selector.entity?.domain) {
      const filterDomain = this.selector.entity.domain;
      const filterDomainIsArray = Array.isArray(filterDomain);
      const entityDomain = computeStateDomain(entity);
      if (
        (filterDomainIsArray && !filterDomain.includes(entityDomain)) ||
        (!filterDomainIsArray && entityDomain !== filterDomain)
      ) {
        return false;
      }
    }
    if (this.selector.entity?.device_class) {
      if (
        !entity.attributes.device_class ||
        entity.attributes.device_class !== this.selector.entity.device_class
      ) {
        return false;
      }
    }
    if (this.selector.entity?.integration) {
      if (
        !this._entityPlaformLookup ||
        this._entityPlaformLookup[entity.entity_id] !==
          this.selector.entity.integration
      ) {
        return false;
      }
    }
    return true;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
