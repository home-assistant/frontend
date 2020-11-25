import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import "../entity/ha-entity-picker";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { subscribeEntityRegistry } from "../../data/entity_registry";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { EntitySelector } from "../../data/selector";

@customElement("ha-selector-entity")
export class HaEntitySelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: EntitySelector;

  @internalProperty() private _entities?: Record<string, string>;

  @property() public value?: any;

  @property() public label?: string;

  protected render() {
    return html`<ha-entity-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .entityFilter=${(entity) => this._filterEntities(entity)}
      allow-custom-entity
    ></ha-entity-picker>`;
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
        this._entities = entityLookup;
      }),
    ];
  }

  private _filterEntities(entity: HassEntity): boolean {
    if (this.selector.entity.domain) {
      if (computeStateDomain(entity) !== this.selector.entity.domain) {
        return false;
      }
    }
    if (this.selector.entity.device_class) {
      if (
        !entity.attributes.device_class ||
        entity.attributes.device_class !== this.selector.entity.device_class
      ) {
        return false;
      }
    }
    if (this.selector.entity.integration) {
      if (
        !this._entities ||
        this._entities[entity.entity_id] !== this.selector.entity.integration
      ) {
        return false;
      }
    }
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
