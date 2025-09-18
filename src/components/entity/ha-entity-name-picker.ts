import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import {
  computeEntityDisplayName,
  ENTITY_NAME_PRESETS,
  NAME_PRESET_TYPES,
} from "../../panels/lovelace/common/entity/compute-display-name";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-list-item";
import "../ha-select";
import "../ha-textfield";
import { ensureArray } from "../../common/array/ensure-array";
import type { EntityNameType } from "../../common/translations/entity-state";

interface Option {
  primary: string;
  secondary?: string;
  value: string;
}

const rowRenderer: ComboBoxLitRenderer<Option> = (item) => html`
  <ha-combo-box-item type="button">
    <span slot="headline">${item.primary}</span>
    ${item.secondary
      ? html`<span slot="supporting-text">${item.secondary}</span>`
      : nothing}
  </ha-combo-box-item>
`;

@customElement("ha-entity-name-picker")
export class HaEntityNamePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state() private _opened = false;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (
      (changedProps.has("_opened") && this._opened) ||
      changedProps.has("entityId")
    ) {
      const options = this._getOptions(this.entityId);
      (this._comboBox as any).filteredItems = options;
    }
  }

  private _getOptions = memoizeOne((entityId?: string) => {
    if (!entityId) {
      return [];
    }
    if (!this.hass.states[entityId]) {
      return [];
    }
    const options = ENTITY_NAME_PRESETS.map<Option>((preset) => ({
      primary: computeEntityDisplayName(
        this.hass,
        this.hass.states[entityId],
        preset
      ),
      secondary: this._localizePreset(preset),
      value: preset,
    }));
    return options;
  });

  private _localizePreset(preset: string) {
    if (preset in NAME_PRESET_TYPES) {
      return ensureArray(NAME_PRESET_TYPES[preset])
        .map((type: EntityNameType) =>
          this.hass.localize(
            `ui.components.entity.entity-name-picker.types.${type}`
          )
        )
        .join(" + ");
    }

    if (preset === "friendly_name") {
      return this.hass.localize(
        "ui.components.entity.entity-name-picker.friendly_name"
      );
    }

    return preset;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .value=${this.value}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .disabled=${this.disabled || !this.entityId}
        .required=${this.required}
        .helper=${this.helper}
        .allowCustomValue=${true}
        item-id-path="value"
        item-value-path="value"
        item-label-path="primary"
        .renderer=${rowRenderer}
        .placeholder=${stateObj
          ? computeEntityDisplayName(this.hass, stateObj, "friendly_name")
          : ""}
        .filteredItems=${this._getOptions(this.entityId)}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
      </ha-combo-box>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _filterChanged(ev: ValueChangedEvent<string>) {
    const filter = ev.detail.value || "";
    this._setValue(filter);
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-name-picker": HaEntityNamePicker;
  }
}
