import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { getStates } from "../../common/entity/get_states";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

interface StateOption {
  value: string;
  label: string;
}

@customElement("ha-entity-state-picker")
class HaEntityStatePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string | string[];

  @property() public attribute?: string;

  @property({ attribute: false }) public extraOptions?: any[];

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property({ attribute: false })
  public hideStates?: string[];

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @state() private _opened = false;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (
      (changedProps.has("_opened") && this._opened) ||
      changedProps.has("entityId") ||
      changedProps.has("attribute") ||
      changedProps.has("extraOptions")
    ) {
      const entityIds = this.entityId ? ensureArray(this.entityId) : [];

      const entitiesOptions = entityIds.map<StateOption[]>((entityId) => {
        const stateObj = this.hass.states[entityId];
        if (!stateObj) {
          return [];
        }

        const states = getStates(this.hass, stateObj, this.attribute).filter(
          (s) => !this.hideStates?.includes(s)
        );

        return states.map((s) => ({
          value: s,
          label: this.attribute
            ? this.hass.formatEntityAttributeValue(stateObj, this.attribute, s)
            : this.hass.formatEntityState(stateObj, s),
        }));
      });

      const options: StateOption[] = [];
      const optionsSet = new Set<string>();
      for (const entityOptions of entitiesOptions) {
        for (const option of entityOptions) {
          if (!optionsSet.has(option.value)) {
            optionsSet.add(option.value);
            options.push(option);
          }
        }
      }

      (this._comboBox as any).filteredItems = [
        ...(this.extraOptions ?? []),
        ...options,
      ];
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .value=${this._value}
        .autofocus=${this.autofocus}
        .label=${this.label ??
        this.hass.localize("ui.components.entity.entity-state-picker.state")}
        .disabled=${this.disabled || !this.entityId}
        .required=${this.required}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomValue}
        item-id-path="value"
        item-value-path="value"
        item-label-path="label"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
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
    "ha-entity-state-picker": HaEntityStatePicker;
  }
}
