import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import type { EntitySelector } from "../../data/selector";
import { filterSelectorEntities } from "../../data/selector";
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

  private _hasIntegration(selector: EntitySelector) {
    return (
      selector.entity?.filter &&
      ensureArray(selector.entity.filter).some((filter) => filter.integration)
    );
  }

  protected render() {
    if (this._hasIntegration(this.selector) && !this._entitySources) {
      return nothing;
    }

    if (!this.selector.entity?.multiple) {
      return html`<ha-entity-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .includeEntities=${this.selector.entity?.include_entities}
        .excludeEntities=${this.selector.entity?.exclude_entities}
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
      this._hasIntegration(this.selector) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector?.entity?.filter) {
      return true;
    }
    return ensureArray(this.selector.entity.filter).some((filter) =>
      filterSelectorEntities(filter, entity, this._entitySources)
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
