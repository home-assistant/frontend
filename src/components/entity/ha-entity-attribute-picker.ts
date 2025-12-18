import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";

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

  private _getItemsMemoized = memoizeOne(
    (
      entityId: string | string[] | undefined,
      hideAttributes: string[] | undefined,
      hass: HomeAssistant
    ): PickerComboBoxItem[] => {
      const entityIds = entityId ? ensureArray(entityId) : [];
      const options: PickerComboBoxItem[] = [];
      const optionsSet = new Set<string>();

      for (const id of entityIds) {
        const stateObj = hass.states[id];
        if (!stateObj) {
          continue;
        }

        const attributes = Object.keys(stateObj.attributes).filter(
          (a) => !hideAttributes?.includes(a)
        );

        for (const attribute of attributes) {
          if (!optionsSet.has(attribute)) {
            optionsSet.add(attribute);
            options.push({
              id: attribute,
              primary: hass.formatEntityAttributeName(stateObj, attribute),
              sorting_label: attribute,
            });
          }
        }
      }

      return options;
    }
  );

  private _getItems = () =>
    this._getItemsMemoized(this.entityId, this.hideAttributes, this.hass);

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label ??
        this.hass.localize(
          "ui.components.entity.entity-attribute-picker.attribute"
        )}
        .disabled=${this.disabled || !this.entityId}
        .required=${this.required}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomValue}
        .getItems=${this._getItems}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (newValue !== this.value) {
      this.value = newValue;
      fireEvent(this, "value-changed", { value: newValue });
      fireEvent(this, "change");
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-attribute-picker": HaEntityAttributePicker;
  }
}
