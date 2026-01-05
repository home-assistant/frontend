import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  STATE_DISPLAY_SPECIAL_CONTENT,
  STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS,
} from "../../state-display/state-display";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../chips/ha-assist-chip";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import "../ha-input-helper-text";
import {
  NO_ITEMS_AVAILABLE_ID,
  type PickerComboBoxItem,
} from "../ha-picker-combo-box";
import "../ha-sortable";

const HIDDEN_ATTRIBUTES = [
  "access_token",
  "available_modes",
  "battery_icon",
  "battery_level",
  "code_arm_required",
  "code_format",
  "color_modes",
  "device_class",
  "editable",
  "effect_list",
  "entity_id",
  "entity_picture",
  "event_types",
  "fan_modes",
  "fan_speed_list",
  "friendly_name",
  "frontend_stream_type",
  "has_date",
  "has_time",
  "hvac_modes",
  "icon",
  "id",
  "max_color_temp_kelvin",
  "max_mireds",
  "max_temp",
  "max",
  "min_color_temp_kelvin",
  "min_mireds",
  "min_temp",
  "min",
  "mode",
  "operation_list",
  "options",
  "percentage_step",
  "precipitation_unit",
  "preset_modes",
  "pressure_unit",
  "remaining",
  "sound_mode_list",
  "source_list",
  "state_class",
  "step",
  "supported_color_modes",
  "supported_features",
  "swing_modes",
  "target_temp_step",
  "temperature_unit",
  "token",
  "unit_of_measurement",
  "visibility_unit",
  "wind_speed_unit",
];

@customElement("ha-entity-state-content-picker")
export class HaStateContentPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-name" }) public allowName =
    false;

  @property() public label?: string;

  @property() public value?: string[] | string;

  @property() public helper?: string;

  @query("ha-generic-picker", true) private _picker?: HaGenericPicker;

  private _editIndex?: number;

  private _getItems = memoizeOne(
    (entityId?: string, stateObj?: HassEntity, allowName?: boolean) => {
      const domain = entityId ? computeDomain(entityId) : undefined;
      const items: PickerComboBoxItem[] = [
        {
          id: "state",
          primary: this.hass.localize(
            "ui.components.state-content-picker.state"
          ),
          sorting_label: this.hass.localize(
            "ui.components.state-content-picker.state"
          ),
        },
        ...(allowName
          ? [
              {
                id: "name",
                primary: this.hass.localize(
                  "ui.components.state-content-picker.name"
                ),
                sorting_label: this.hass.localize(
                  "ui.components.state-content-picker.name"
                ),
              } satisfies PickerComboBoxItem,
            ]
          : []),
        {
          id: "last_changed",
          primary: this.hass.localize(
            "ui.components.state-content-picker.last_changed"
          ),
          sorting_label: this.hass.localize(
            "ui.components.state-content-picker.last_changed"
          ),
        },
        {
          id: "last_updated",
          primary: this.hass.localize(
            "ui.components.state-content-picker.last_updated"
          ),
          sorting_label: this.hass.localize(
            "ui.components.state-content-picker.last_updated"
          ),
        },
        ...(domain
          ? STATE_DISPLAY_SPECIAL_CONTENT.filter((content) =>
              STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[domain]?.includes(content)
            ).map(
              (content) =>
                ({
                  id: content,
                  primary: this.hass.localize(
                    `ui.components.state-content-picker.${content}`
                  ),
                  sorting_label: this.hass.localize(
                    `ui.components.state-content-picker.${content}`
                  ),
                }) satisfies PickerComboBoxItem
            )
          : []),
        ...Object.keys(stateObj?.attributes ?? {})
          .filter((a) => !HIDDEN_ATTRIBUTES.includes(a))
          .map(
            (attribute) =>
              ({
                id: attribute,
                primary: this.hass.formatEntityAttributeName(
                  stateObj!,
                  attribute
                ),
                sorting_label: this.hass.formatEntityAttributeName(
                  stateObj!,
                  attribute
                ),
              }) satisfies PickerComboBoxItem
          ),
      ];
      return items;
    }
  );

  protected render() {
    const value = this._value;

    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-generic-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .required=${this.required && !value.length}
        .value=${this._getPickerValue()}
        .getItems=${this._getFilteredItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .searchFn=${this._searchFn}
        @value-changed=${this._pickerValueChanged}
      >
        <div slot="field" class="container">
          <ha-sortable
            no-style
            @item-moved=${this._moveItem}
            .disabled=${this.disabled}
            handle-selector="button.primary.action"
            filter=".add"
          >
            <ha-chip-set>
              ${repeat(
                this._value,
                (item) => item,
                (item: string, idx) => {
                  const label = this._getItemLabel(item, stateObj);
                  const isValid = !!label;
                  return html`
                    <ha-input-chip
                      data-idx=${idx}
                      @remove=${this._removeItem}
                      @click=${this._editItem}
                      .label=${label || item}
                      .selected=${!this.disabled}
                      .disabled=${this.disabled}
                      class=${!isValid ? "invalid" : ""}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiDragHorizontalVariant}
                      ></ha-svg-icon>
                    </ha-input-chip>
                  `;
                }
              )}
              ${this.disabled
                ? nothing
                : html`
                    <ha-assist-chip
                      @click=${this._addItem}
                      .disabled=${this.disabled}
                      label=${this.hass.localize(
                        "ui.components.entity.entity-state-content-picker.add"
                      )}
                      class="add"
                    >
                      <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                    </ha-assist-chip>
                  `}
            </ha-chip-set>
          </ha-sortable>
        </div>
      </ha-generic-picker>
      ${this._renderHelper()}
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`
          <ha-input-helper-text .disabled=${this.disabled}>
            ${this.helper}
          </ha-input-helper-text>
        `
      : nothing;
  }

  private async _addItem(ev: Event) {
    ev.stopPropagation();
    this._editIndex = undefined;
    await this.updateComplete;
    await this._picker?.open();
  }

  private async _editItem(ev: Event) {
    ev.stopPropagation();
    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx || "",
      10
    );
    this._editIndex = idx;
    await this.updateComplete;
    await this._picker?.open();
  }

  private get _value() {
    return !this.value ? [] : ensureArray(this.value);
  }

  private _getItemLabel = memoizeOne(
    (value: string, stateObj?: HassEntity): string | undefined => {
      const stateObjForItems = this.entityId
        ? this.hass.states[this.entityId]
        : stateObj;
      const items = this._getItems(
        this.entityId,
        stateObjForItems,
        this.allowName
      );
      return items.find((item) => item.id === value)?.primary;
    }
  );

  private _toValue = memoizeOne((value: string[]): typeof this.value => {
    if (value.length === 0) {
      return undefined;
    }
    if (value.length === 1) {
      return value[0];
    }
    return value;
  });

  private _getPickerValue(): string | undefined {
    if (this._editIndex != null) {
      return this._value[this._editIndex];
    }
    return undefined;
  }

  private _customValueOption = memoizeOne(
    (text: string): PickerComboBoxItem => ({
      id: text,
      primary: this.hass.localize(
        "ui.components.entity.entity-state-content-picker.custom_attribute"
      ),
      secondary: `"${text}"`,
      search_labels: {
        primary: text,
        secondary: `"${text}"`,
        id: text,
      },
      sorting_label: text,
    })
  );

  private _getFilteredItems = (): PickerComboBoxItem[] => {
    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;
    const items = this._getItems(this.entityId, stateObj, this.allowName);
    const currentValue =
      this._editIndex != null ? this._value[this._editIndex] : undefined;

    const value = this._value;

    const filteredItems = items.filter(
      (item) => !value.includes(item.id) || item.id === currentValue
    );

    // When editing an existing custom value, include it in the base items
    if (currentValue && !items.find((item) => item.id === currentValue)) {
      filteredItems.push(this._customValueOption(currentValue));
    }

    return filteredItems;
  };

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;
    const items = this._getItems(this.entityId, stateObj, this.allowName);

    // If the search string does not match with the id of any of the items,
    // offer to add it as a custom attribute
    const existingItem = items.find((item) => item.id === searchString);
    if (searchString && !existingItem) {
      return [this._customValueOption(searchString)];
    }

    return [];
  };

  private _searchFn = (
    search: string,
    filteredItems: PickerComboBoxItem[],
    _allItems: PickerComboBoxItem[]
  ): PickerComboBoxItem[] => {
    if (!search) {
      return filteredItems;
    }

    // Always exclude NO_ITEMS_AVAILABLE_ID (since custom values are allowed) and currentValue (the custom value being edited)
    return filteredItems.filter((item) => item.id !== NO_ITEMS_AVAILABLE_ID);
  };

  private async _moveItem(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const value = this._value;
    const newValue = value.concat();
    const element = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, element);
    this._setValue(newValue);
  }

  private async _removeItem(ev: Event) {
    ev.stopPropagation();
    const value = [...this._value];
    const idx = parseInt((ev.target as HTMLElement).dataset.idx || "", 10);
    value.splice(idx, 1);
    this._setValue(value);
  }

  private _pickerValueChanged(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (this.disabled || !value) {
      return;
    }

    const newValue = [...this._value];

    if (this._editIndex != null) {
      newValue[this._editIndex] = value;
      this._editIndex = undefined;
    } else {
      newValue.push(value);
    }

    this._setValue(newValue);

    if (this._picker) {
      this._picker.value = undefined;
    }
  }

  private _setValue(value: string[]) {
    const newValue = this._toValue(value);
    this.value = newValue;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static styles = css`
    :host {
      position: relative;
      width: 100%;
    }

    .container {
      position: relative;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-radius: var(--ha-border-radius-sm);
      border-end-end-radius: var(--ha-border-radius-square);
      border-end-start-radius: var(--ha-border-radius-square);
    }
    .container:after {
      display: block;
      content: "";
      position: absolute;
      pointer-events: none;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      width: 100%;
      background-color: var(
        --mdc-text-field-idle-line-color,
        rgba(0, 0, 0, 0.42)
      );
      transform:
        height 180ms ease-in-out,
        background-color 180ms ease-in-out;
    }
    :host([disabled]) .container:after {
      background-color: var(
        --mdc-text-field-disabled-line-color,
        rgba(0, 0, 0, 0.42)
      );
    }
    .container:focus-within:after {
      height: 2px;
      background-color: var(--mdc-theme-primary);
    }

    label {
      display: block;
      margin: 0 0 var(--ha-space-2);
    }

    .add {
      order: 1;
    }

    ha-chip-set {
      padding: var(--ha-space-2) var(--ha-space-2);
    }

    .invalid {
      text-decoration: line-through;
    }

    .sortable-fallback {
      display: none;
      opacity: 0;
    }

    .sortable-ghost {
      opacity: 0.4;
    }

    .sortable-drag {
      cursor: grabbing;
    }

    ha-input-helper-text {
      display: block;
      margin: var(--ha-space-2) 0 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-state-content-picker": HaStateContentPicker;
  }
}
