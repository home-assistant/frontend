import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";

interface AttributeOption {
  value: string;
  label: string;
}

@customElement("ha-entity-attribute-picker")
class HaEntityAttributePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string | string[];

  /**
   * List of attributes to be hidden.
   * @type {Array}
   * @attr hide-attributes
   */
  @property({ type: Array, attribute: "hide-attributes" })
  public hideAttributes?: string[];

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

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
      changedProps.has("attribute")
    ) {
      const entityIds = this.entityId ? ensureArray(this.entityId) : [];
      const entitiesOptions = entityIds.map<AttributeOption[]>((entityId) => {
        const stateObj = this.hass.states[entityId];
        if (!stateObj) {
          return [];
        }

        const attributes = Object.keys(stateObj.attributes).filter(
          (a) => !this.hideAttributes?.includes(a)
        );

        return attributes.map((a) => ({
          value: a,
          label: this.hass.formatEntityAttributeName(stateObj, a),
        }));
      });

      const options: AttributeOption[] = [];
      const optionsSet = new Set<string>();
      for (const entityOptions of entitiesOptions) {
        for (const option of entityOptions) {
          if (!optionsSet.has(option.value)) {
            optionsSet.add(option.value);
            options.push(option);
          }
        }
      }

      (this._comboBox as any).filteredItems = options;
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .value=${this.value}
        .autofocus=${this.autofocus}
        .label=${this.label ??
        this.hass.localize(
          "ui.components.entity.entity-attribute-picker.attribute"
        )}
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
    "ha-entity-attribute-picker": HaEntityAttributePicker;
  }
}
