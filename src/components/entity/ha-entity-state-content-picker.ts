import "@material/mwc-menu/mwc-menu-surface";
import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  STATE_DISPLAY_SPECIAL_CONTENT,
  STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS,
} from "../../state-display/state-display";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../chips/ha-assist-chip";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-sortable";

interface StateContentOption {
  primary: string;
  value: string;
}

const rowRenderer: ComboBoxLitRenderer<StateContentOption> = (item) => html`
  <ha-combo-box-item type="button">
    <span slot="headline">${item.primary}</span>
  </ha-combo-box-item>
`;

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

  @query(".container", true) private _container?: HTMLDivElement;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  @state() private _opened = false;

  private _editIndex?: number;

  private _options = memoizeOne(
    (entityId?: string, stateObj?: HassEntity, allowName?: boolean) => {
      const domain = entityId ? computeDomain(entityId) : undefined;
      return [
        {
          primary: this.hass.localize(
            "ui.components.state-content-picker.state"
          ),
          value: "state",
        },
        ...(allowName
          ? [
              {
                primary: this.hass.localize(
                  "ui.components.state-content-picker.name"
                ),
                value: "name",
              },
            ]
          : []),
        {
          primary: this.hass.localize(
            "ui.components.state-content-picker.last_changed"
          ),
          value: "last_changed",
        },
        {
          primary: this.hass.localize(
            "ui.components.state-content-picker.last_updated"
          ),
          value: "last_updated",
        },
        ...(domain
          ? STATE_DISPLAY_SPECIAL_CONTENT.filter((content) =>
              STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[domain]?.includes(content)
            ).map((content) => ({
              primary: this.hass.localize(
                `ui.components.state-content-picker.${content}`
              ),
              value: content,
            }))
          : []),
        ...Object.keys(stateObj?.attributes ?? {})
          .filter((a) => !HIDDEN_ATTRIBUTES.includes(a))
          .map((attribute) => ({
            primary: this.hass.formatEntityAttributeName(stateObj!, attribute),
            value: attribute,
          })),
      ] satisfies StateContentOption[];
    }
  );

  protected render() {
    const value = this._value;

    const stateObj = this.entityId
      ? this.hass.states[this.entityId]
      : undefined;

    const options = this._options(this.entityId, stateObj, this.allowName);

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <div class="container ${this.disabled ? "disabled" : ""}">
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
                const label = options.find((o) => o.value === item)?.primary;
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

        <mwc-menu-surface
          .open=${this._opened}
          @closed=${this._onClosed}
          @opened=${this._onOpened}
          @input=${stopPropagation}
          .anchor=${this._container}
        >
          <ha-combo-box
            .hass=${this.hass}
            .value=${""}
            .autofocus=${this.autofocus}
            .disabled=${this.disabled || !this.entityId}
            .required=${this.required && !value.length}
            .helper=${this.helper}
            .items=${options}
            allow-custom-value
            item-id-path="value"
            item-value-path="value"
            item-label-path="primary"
            .renderer=${rowRenderer}
            @opened-changed=${this._openedChanged}
            @value-changed=${this._comboBoxValueChanged}
            @filter-changed=${this._filterChanged}
          >
          </ha-combo-box>
        </mwc-menu-surface>
      </div>
    `;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
    this._opened = false;
    this._editIndex = undefined;
  }

  private async _onOpened(ev) {
    if (!this._opened) {
      return;
    }
    ev.stopPropagation();
    this._opened = true;
    await this._comboBox?.focus();
    await this._comboBox?.open();
  }

  private async _addItem(ev) {
    ev.stopPropagation();
    this._opened = true;
  }

  private async _editItem(ev) {
    ev.stopPropagation();
    const idx = parseInt(ev.currentTarget.dataset.idx, 10);
    this._editIndex = idx;
    this._opened = true;
  }

  private get _value() {
    return !this.value ? [] : ensureArray(this.value);
  }

  private _toValue = memoizeOne((value: string[]): typeof this.value => {
    if (value.length === 0) {
      return undefined;
    }
    if (value.length === 1) {
      return value[0];
    }
    return value;
  });

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    const open = ev.detail.value;
    if (open) {
      const options = this._comboBox.items || [];

      const initialValue =
        this._editIndex != null ? this._value[this._editIndex] : "";
      const filteredItems = this._filterSelectedOptions(options, initialValue);

      this._comboBox.filteredItems = filteredItems;
      this._comboBox.setInputValue(initialValue);
    } else {
      this._opened = false;
    }
  }

  private _filterSelectedOptions = (
    options: StateContentOption[],
    current?: string
  ) => {
    const value = this._value;

    return options.filter(
      (option) => !value.includes(option.value) || option.value === current
    );
  };

  private _filterChanged(ev: ValueChangedEvent<string>) {
    const input = ev.detail.value;
    const filter = input?.toLowerCase() || "";
    const options = this._comboBox.items || [];

    const currentValue =
      this._editIndex != null ? this._value[this._editIndex] : "";

    this._comboBox.filteredItems = this._filterSelectedOptions(
      options,
      currentValue
    );

    if (!filter) {
      return;
    }

    const fuseOptions: IFuseOptions<StateContentOption> = {
      keys: ["primary", "secondary", "value"],
      isCaseSensitive: false,
      minMatchCharLength: Math.min(filter.length, 2),
      threshold: 0.2,
      ignoreDiacritics: true,
    };

    const fuse = new Fuse(this._comboBox.filteredItems, fuseOptions);
    const filteredItems = fuse.search(filter).map((result) => result.item);

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
    this._filterChanged({ detail: { value: "" } } as ValueChangedEvent<string>);
  }

  private async _removeItem(ev) {
    ev.stopPropagation();
    const value = [...this._value];
    const idx = parseInt(ev.target.dataset.idx, 10);
    value.splice(idx, 1);
    this._setValue(value);
    await this.updateComplete;
    this._filterChanged({ detail: { value: "" } } as ValueChangedEvent<string>);
  }

  private _comboBoxValueChanged(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (this.disabled || value === "") {
      return;
    }

    const newValue = [...this._value];

    if (this._editIndex != null) {
      newValue[this._editIndex] = value;
    } else {
      newValue.push(value);
    }

    this._setValue(newValue);
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
    .container.disabled:after {
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

    mwc-menu-surface {
      --mdc-menu-min-width: 100%;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-state-content-picker": HaStateContentPicker;
  }
}
