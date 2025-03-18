import type { TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiHome, mdiHomeOutline } from "@mdi/js";
import { fireEvent } from "../common/dom/fire_event";
import { computeStateName } from "../common/entity/compute_state_name";
import { entityIcon } from "../data/icons";
import type { HomeAssistant } from "../types";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";
import "./ha-svg-icon";
import "./ha-textfield";
import "./ha-icon-button";

export interface EntitiesDisplayValue {
  hidden?: string[];
  order?: string[];
  overview_hidden?: string[];
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
        .actionsRenderer=${this._actionsRenderer}
      ></ha-items-display-editor>
    `;
  }

  private _actionsRenderer = (item: DisplayItem) => {
    const hidden = this.value?.hidden?.includes(item.value);
    if (hidden) {
      return nothing;
    }
    const overviewHidden = this.value?.overview_hidden?.includes(item.value);

    return html`
      <ha-icon-button
        .path=${overviewHidden ? mdiHomeOutline : mdiHome}
        .value=${item.value}
        @click=${this._toggleOverviewHidden}
      ></ha-icon-button>
    `;
  };

  private _toggleOverviewHidden = (ev) => {
    ev.stopPropagation();
    const value = ev.currentTarget.value as string;

    const newHidden = this.value?.overview_hidden?.concat() ?? [];

    if (newHidden.includes(value)) {
      newHidden.splice(newHidden.indexOf(value), 1);
    } else {
      newHidden.push(value);
    }
    const newValue: EntitiesDisplayValue = {
      ...this.value,
      overview_hidden: newHidden,
    };

    this._valueChanged(newValue);
  };

  private _itemDisplayChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value as DisplayValue;
    const newValue: EntitiesDisplayValue = {
      ...this.value,
      ...value,
    };
    this._valueChanged(newValue);
  }

  private _valueChanged(value: EntitiesDisplayValue) {
    // Remove empty arrays
    if (value.overview_hidden?.length === 0) {
      delete value.overview_hidden;
    }
    if (value.hidden?.length === 0) {
      delete value.hidden;
    }
    if (value.order?.length === 0) {
      delete value.order;
    }
    fireEvent(this, "value-changed", { value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entities-display-editor": HaEntitiesDisplayEditor;
  }
}
