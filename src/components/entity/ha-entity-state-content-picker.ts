import { mdiDrag } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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
import "../ha-combo-box";
import "../ha-sortable";
import "../chips/ha-input-chip";
import "../chips/ha-chip-set";
import type { HaComboBox } from "../ha-combo-box";

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
class HaEntityStatePicker extends LitElement {
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

  @state() private _opened = false;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  private options = memoizeOne(
    (entityId?: string, stateObj?: HassEntity, allowName?: boolean) => {
      const domain = entityId ? computeDomain(entityId) : undefined;
      return [
        {
          label: this.hass.localize("ui.components.state-content-picker.state"),
          value: "state",
        },
        ...(allowName
          ? [
              {
                label: this.hass.localize(
                  "ui.components.state-content-picker.name"
                ),
                value: "name",
              },
            ]
          : []),
        {
          label: this.hass.localize(
            "ui.components.state-content-picker.last_changed"
          ),
          value: "last_changed",
        },
        {
          label: this.hass.localize(
            "ui.components.state-content-picker.last_updated"
          ),
          value: "last_updated",
        },
        ...(domain
          ? STATE_DISPLAY_SPECIAL_CONTENT.filter((content) =>
              STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[domain]?.includes(content)
            ).map((content) => ({
              label: this.hass.localize(
                `ui.components.state-content-picker.${content}`
              ),
              value: content,
            }))
          : []),
        ...Object.keys(stateObj?.attributes ?? {})
          .filter((a) => !HIDDEN_ATTRIBUTES.includes(a))
          .map((attribute) => ({
            value: attribute,
            label: this.hass.formatEntityAttributeName(stateObj!, attribute),
          })),
      ];
    }
  );

  private _filter = "";

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const value = this._value;

    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;

    const options = this.options(this.entityId, stateObj, this.allowName);
    const optionItems = options.filter(
      (option) => !this._value.includes(option.value)
    );

    return html`
      ${value?.length
        ? html`
            <ha-sortable
              no-style
              @item-moved=${this._moveItem}
              .disabled=${this.disabled}
              handle-selector="button.primary.action"
            >
              <ha-chip-set>
                ${repeat(
                  this._value,
                  (item) => item,
                  (item, idx) => {
                    const label =
                      options.find((option) => option.value === item)?.label ||
                      item;
                    return html`
                      <ha-input-chip
                        .idx=${idx}
                        @remove=${this._removeItem}
                        .label=${label}
                        selected
                      >
                        <ha-svg-icon slot="icon" .path=${mdiDrag}></ha-svg-icon>
                        ${label}
                      </ha-input-chip>
                    `;
                  }
                )}
              </ha-chip-set>
            </ha-sortable>
          `
        : nothing}

      <ha-combo-box
        item-value-path="value"
        item-label-path="label"
        .hass=${this.hass}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required && !value.length}
        .value=${""}
        .items=${optionItems}
        allow-custom-value
        @filter-changed=${this._filterChanged}
        @value-changed=${this._comboBoxValueChanged}
        @opened-changed=${this._openedChanged}
      ></ha-combo-box>
    `;
  }

  private get _value() {
    return !this.value ? [] : ensureArray(this.value);
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    this._comboBox.filteredItems = this._comboBox.items;
  }

  private _filterChanged(ev?: CustomEvent): void {
    this._filter = ev?.detail.value || "";

    const filteredItems = this._comboBox.items?.filter((item) => {
      const label = item.label || item.value;
      return label.toLowerCase().includes(this._filter?.toLowerCase());
    });

    if (this._filter) {
      filteredItems?.unshift({ label: this._filter, value: this._filter });
    }

    this._comboBox.filteredItems = filteredItems;
  }

  private async _moveItem(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const value = this._value;
    const newValue = value.concat();
    const element = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, element);
    this._setValue(newValue);
    await this.updateComplete;
    this._filterChanged();
  }

  private async _removeItem(ev) {
    ev.stopPropagation();
    const value: string[] = [...this._value];
    value.splice(ev.target.idx, 1);
    this._setValue(value);
    await this.updateComplete;
    this._filterChanged();
  }

  private _comboBoxValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (this.disabled || newValue === "") {
      return;
    }

    const currentValue = this._value;

    if (currentValue.includes(newValue)) {
      return;
    }

    setTimeout(() => {
      this._filterChanged();
      this._comboBox.setInputValue("");
    }, 0);

    this._setValue([...currentValue, newValue]);
  }

  private _setValue(value: string[]) {
    const newValue =
      value.length === 0 ? undefined : value.length === 1 ? value[0] : value;
    this.value = newValue;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static styles = css`
    :host {
      position: relative;
    }

    ha-chip-set {
      padding: 8px 0;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-state-content-picker": HaEntityStatePicker;
  }
}
