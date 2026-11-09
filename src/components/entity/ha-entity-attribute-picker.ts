import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { consume } from "../../common/decorators/consume";
import {
  consumeEntityStates,
  consumeLocalize,
} from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import { formattersContext } from "../../data/context";
import type { HomeAssistantFormatters, ValueChangedEvent } from "../../types";
import "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";

type FormatEntityAttributeName =
  HomeAssistantFormatters["formatEntityAttributeName"];

@customElement("ha-entity-attribute-picker")
class HaEntityAttributePicker extends LitElement {
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

  @state()
  @consumeEntityStates({ entityIdPath: ["entityId"] })
  private _stateObjs?: Record<string, HassEntity>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<HomeAssistantFormatters, FormatEntityAttributeName>({
    transformer: (formatters) => formatters?.formatEntityAttributeName,
  })
  private _formatEntityAttributeName!: FormatEntityAttributeName;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  private _getItemsMemoized = memoizeOne(
    (
      entityId: string | string[] | undefined,
      stateObjs: Record<string, HassEntity> | undefined,
      hideAttributes: string[] | undefined,
      formatEntityAttributeName: FormatEntityAttributeName
    ): PickerComboBoxItem[] => {
      const entityIds = entityId ? ensureArray(entityId) : [];
      const options: PickerComboBoxItem[] = [];
      const optionsSet = new Set<string>();

      for (const id of entityIds) {
        const stateObj = stateObjs?.[id];
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
              primary: formatEntityAttributeName(stateObj, attribute),
              sorting_label: attribute,
            });
          }
        }
      }

      return options;
    }
  );

  private _getItems = () =>
    this._getItemsMemoized(
      this.entityId,
      this._stateObjs,
      this.hideAttributes,
      this._formatEntityAttributeName
    );

  private _valueRenderer = memoizeOne(
    (items: PickerComboBoxItem[]): PickerValueRenderer =>
      (value: string) => {
        const item = items.find((option) => option.id === value);
        return html`<span slot="headline">${item?.primary ?? value}</span>`;
      }
  );

  protected render() {
    return html`
      <ha-generic-picker
        .value=${this.value}
        .label=${
          this.label ??
          this._localize(
            "ui.components.entity.entity-attribute-picker.attribute"
          )
        }
        .disabled=${this.disabled || !this.entityId}
        .required=${this.required}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomValue}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer(this._getItems())}
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
