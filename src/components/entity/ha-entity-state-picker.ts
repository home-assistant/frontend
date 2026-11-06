import type { ContextType } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { consume } from "../../common/decorators/consume";
import { consumeEntityStates } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import { getStates } from "../../common/entity/get_states";
import {
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../data/context";
import type { HomeAssistantFormatters, ValueChangedEvent } from "../../types";
import "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";

@customElement("ha-entity-state-picker")
export class HaEntityStatePicker extends LitElement {
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

  @state()
  @consumeEntityStates({ entityIdPath: ["entityId"] })
  private _stateObjs?: Record<string, HassEntity>;

  @consume({ context: statesContext, subscribe: true })
  private _states?: ContextType<typeof statesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  private _getItems = memoizeOne(
    (
      states: HassEntities | null | undefined,
      formatters: HomeAssistantFormatters,
      language: string,
      entityId: string | string[] | undefined,
      attribute: string | undefined,
      hideStates: string[] | undefined,
      extraOptions: PickerComboBoxItem[] | undefined
    ): PickerComboBoxItem[] => {
      const entityIds = entityId ? ensureArray(entityId) : [];

      const entitiesOptions = entityIds.map<PickerComboBoxItem[]>(
        (entityIdItem) => {
          const stateObj =
            states?.[entityIdItem] ||
            ({ entity_id: entityIdItem, attributes: {} } as HassEntity);

          const options = getStates(
            states ?? {},
            language,
            stateObj,
            attribute
          ).filter((s) => !hideStates?.includes(s));

          return options
            .map((s) => {
              const primary = attribute
                ? formatters.formatEntityAttributeValue(stateObj, attribute, s)
                : formatters.formatEntityState(stateObj, s);
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
      this._states,
      this._formatters,
      this._i18n.locale.language,
      this.entityId,
      this.attribute,
      this.hideStates,
      this.extraOptions
    );

  private _valueRenderer: PickerValueRenderer = (value: string) => {
    const items = this._getFilteredItems();
    const item = items.find((option) => option.id === value);
    return html`<span slot="headline">${item?.primary ?? value}</span>`;
  };

  private _computeDefaultLabel(): string {
    // When an attribute is configured, default to the attribute's friendly
    // name (e.g. "Source") instead of the generic "State". Requires a concrete
    // entity to resolve the translated name; otherwise fall back to "State".
    if (this.attribute && this.entityId) {
      const entityId = ensureArray(this.entityId)[0];
      const stateObj = entityId ? this._stateObjs?.[entityId] : undefined;
      if (stateObj) {
        return this._formatters.formatEntityAttributeName(
          stateObj,
          this.attribute
        );
      }
    }
    return this._i18n.localize(
      "ui.components.entity.entity-state-picker.state"
    );
  }

  protected render() {
    const noEntity = !ensureArray(this.entityId)?.length;

    return html`
      <ha-generic-picker
        .allowCustomValue=${this.allowCustomValue}
        .disabled=${this.disabled || noEntity}
        .autofocus=${this.autofocus}
        .required=${this.required}
        .label=${this.label ?? this._computeDefaultLabel()}
        .helper=${this.helper}
        .value=${this.value}
        .getItems=${this._getFilteredItems}
        .valueRenderer=${this._valueRenderer}
        .notFoundLabel=${this._i18n.localize(
          "ui.components.combo-box.no_match"
        )}
        .customValueLabel=${this._i18n.localize(
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
