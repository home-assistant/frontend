import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { computeStateName } from "../common/entity/compute_state_name";
import { entityIcon } from "../data/icons";
import type { HomeAssistant } from "../types";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";

export interface EntitiesDisplayValue {
  hidden?: string[];
  order?: string[];
}

@customElement("ha-entities-display-editor")
export class HaEntitiesDisplayEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: EntitiesDisplayValue;

  @property({ attribute: false }) public entitiesIds: string[] = [];

  @property() public helper?: string;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render(): TemplateResult {
    const entities = this.entitiesIds
      .map((entityId) => this.hass.states[entityId])
      .filter(Boolean);

    const items: DisplayItem[] = entities.map((entity) => ({
      value: entity.entity_id,
      label: computeStateName(entity),
      icon: entityIcon(this.hass, entity),
    }));

    const value: DisplayValue = {
      order: this.value?.order ?? [],
      hidden: this.value?.hidden ?? [],
    };

    return html`
      <ha-items-display-editor
        .hass=${this.hass}
        .items=${items}
        .value=${value}
        @value-changed=${this._itemDisplayChanged}
      ></ha-items-display-editor>
    `;
  }

  private _itemDisplayChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value as DisplayValue;
    const newValue: EntitiesDisplayValue = {
      ...this.value,
      ...value,
    };
    if (newValue.hidden?.length === 0) {
      delete newValue.hidden;
    }
    if (newValue.order?.length === 0) {
      delete newValue.order;
    }
    fireEvent(this, "value-changed", { value: newValue });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entities-display-editor": HaEntitiesDisplayEditor;
  }
}
