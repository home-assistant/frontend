import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { getStates } from "../../common/entity/get_states";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";

@customElement("ha-entity-state-picker")
export class HaEntityStatePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string | string[];

  @property() public attribute?: string;

  @property({ attribute: false }) public extraOptions?: PickerComboBoxItem[];

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

  private _getItems = memoizeOne(
    (
      hass: HomeAssistant,
      entityId: string | string[] | undefined,
      attribute: string | undefined,
      hideStates: string[] | undefined,
      extraOptions: PickerComboBoxItem[] | undefined
    ): PickerComboBoxItem[] => {
      const entityIds = entityId ? ensureArray(entityId) : [];

      const entitiesOptions = entityIds.map<PickerComboBoxItem[]>(
        (entityIdItem) => {
          const stateObj = hass.states[entityIdItem] || {
            entity_id: entityIdItem,
            attributes: {},
          };

          const states = getStates(hass, stateObj, attribute).filter(
            (s) => !hideStates?.includes(s)
          );

          return states
            .map((s) => {
              const primary = attribute
                ? hass.formatEntityAttributeValue(stateObj, attribute, s)
                : hass.formatEntityState(stateObj, s);
              return {
                id: s,
                primary,
                sorting_label: primary,
              };
            })
            .filter((option) => option.id && option.primary);
        }
      );

      const options: PickerComboBoxItem[] = [];
      const optionsSet = new Set<string>();
      for (const entityOptions of entitiesOptions) {
        for (const option of entityOptions) {
          if (!optionsSet.has(option.id)) {
            optionsSet.add(option.id);
            options.push(option);
          }
        }
      }

      if (extraOptions) {
        // Filter out any extraOptions with empty primary or id fields
        const validExtraOptions = extraOptions.filter(
          (option) => option.id && option.primary
        );
        options.unshift(...validExtraOptions);
      }

      return options;
    }
  );

  private _getFilteredItems = (
    _searchString?: string,
    _section?: string
  ): PickerComboBoxItem[] =>
    this._getItems(
      this.hass,
      this.entityId,
      this.attribute,
      this.hideStates,
      this.extraOptions
    );

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .allowCustomValue=${this.allowCustomValue}
        .disabled=${this.disabled || !this.entityId}
        .autofocus=${this.autofocus}
        .required=${this.required}
        .label=${this.label ??
        this.hass.localize("ui.components.entity.entity-state-picker.state")}
        .helper=${this.helper}
        .value=${this.value}
        .getItems=${this._getFilteredItems}
        .notFoundLabel=${this.hass.localize("ui.components.combo-box.no_match")}
        .customValueLabel=${this.hass.localize(
          "ui.components.entity.entity-state-picker.add_custom_state"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    if (newValue !== this.value) {
      this._setValue(newValue);
    }
  }

  private _setValue(value: string | undefined) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-state-picker": HaEntityStatePicker;
  }
}
