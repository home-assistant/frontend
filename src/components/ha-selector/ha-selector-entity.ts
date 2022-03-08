import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { subscribeEntityRegistry } from "../../data/entity_registry";
import { EntitySelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";
import "../entity/ha-entity-picker";

@customElement("ha-selector-entity")
export class HaEntitySelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: EntitySelector;

  @state() private _entityPlaformLookup?: Record<string, string>;

  @property() public value?: any;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    if (!this.selector.entity.multiple) {
      return html`<ha-entity-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        allow-custom-entity
      ></ha-entity-picker>`;
    }

    // For multiple, the value is a list.
    const value = this._normalizedValue as string[];

    return html`
      ${this.label ? html`<div>${this.label}</div>` : ""}
      ${repeat(
        value,
        (val) => val,
        (entityId, index) => html`
          <ha-entity-picker
            .hass=${this.hass}
            .value=${entityId}
            .entityFilter=${this._filterEntities}
            .disabled=${this.disabled}
            .index=${index}
            allow-custom-entity
            @value-changed=${this._valueChanged}
          ></ha-entity-picker>
        `
      )}
      <ha-entity-picker
        .hass=${this.hass}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        allow-custom-entity
        @value-changed=${this._valueChanged}
      ></ha-entity-picker>
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

  private get _normalizedValue() {
    if (!this.selector.entity.multiple) {
      return this.value;
    }

    if (!this.value) {
      return [];
    }
    return Array.isArray(this.value) ? this.value : [this.value];
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

  // this method is only used when multiple: true
  private _valueChanged(ev: any) {
    ev.stopPropagation();

    // undefined = new value
    const index = ev.target.index as number | undefined;
    // undefined = remove
    const newValue = ev.detail.value as string | undefined;

    let updatedValue: string[] | undefined;

    if (index === undefined) {
      if (newValue) {
        updatedValue = [...this._normalizedValue, newValue];
      }
      ev.target.value = "";
    } else if (newValue) {
      updatedValue = [...this._normalizedValue];
      updatedValue[index] = newValue;
    } else {
      updatedValue = this._normalizedValue.filter((_, i) => i !== index);
    }

    if (updatedValue) {
      fireEvent(this, "value-changed", {
        value: updatedValue,
      });
    }
  }

  static styles = css`
    ha-entity-picker + ha-entity-picker {
      display: block;
      margin-top: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
