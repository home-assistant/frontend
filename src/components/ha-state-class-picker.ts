import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext } from "../data/context";
import { SENSOR_STATE_CLASSES } from "../data/sensor_entity_constants";
import { computeStateClassName } from "../data/entity/state_class";
import type {
  HomeAssistantInternationalization,
  ValueChangedEvent,
} from "../types";
import "./chips/ha-chip-set";
import "./chips/ha-input-chip";
import "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

export const getStateClassOptions = (
  localize: LocalizeFunc,
  stateClasses: string[]
): PickerComboBoxItem[] =>
  SENSOR_STATE_CLASSES.filter((stateClass) =>
    stateClasses.includes(stateClass)
  ).map((stateClass) => {
    const primary = computeStateClassName(localize, stateClass);
    return { id: stateClass, primary, sorting_label: primary };
  });

@customElement("ha-state-class-picker")
export class HaStateClassPicker extends LitElement {
  @property({ attribute: false }) public value?: string | string[];

  @property({ type: Boolean }) public multiple = false;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: false }) public stateClasses?: string[];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  private _translationsLoaded = false;

  protected willUpdate() {
    if (this._translationsLoaded || !this._i18n) {
      return;
    }
    this._translationsLoaded = true;
    this._i18n.loadBackendTranslation("entity_component", "sensor");
  }

  private get _value(): string[] {
    return this.value ? ensureArray(this.value) : [];
  }

  private _stateClassName(stateClass: string): string {
    return this._i18n
      ? computeStateClassName(this._i18n.localize, stateClass)
      : stateClass;
  }

  private _options = memoizeOne(
    (
      localize: LocalizeFunc | undefined,
      stateClasses: string[]
    ): PickerComboBoxItem[] =>
      localize ? getStateClassOptions(localize, stateClasses) : []
  );

  private _availableOptions = memoizeOne(
    (options: PickerComboBoxItem[], selected: string[]) =>
      options.filter((option) => !selected.includes(option.id))
  );

  private _getItems = () => {
    const options = this._options(
      this._i18n?.localize,
      this.stateClasses || SENSOR_STATE_CLASSES
    );
    return this.multiple
      ? this._availableOptions(options, this._value)
      : options;
  };

  private _valueRenderer = (value: string) =>
    html`<span slot="headline">${this._stateClassName(value)}</span>`;

  private _notFoundLabel = (search: string) => {
    const term = html`<b>'${search}'</b>`;
    return this._i18n
      ? this._i18n.localize("ui.components.state-class-picker.no_match", {
          term,
        })
      : html`No state classes found for ${term}`;
  };

  protected render() {
    const localize = this._i18n?.localize;
    const emptyLabel = localize?.(
      "ui.components.state-class-picker.no_state_classes"
    );

    if (this.multiple) {
      const value = this._value;
      return html`
        ${
          value.length
            ? html`
                <ha-chip-set>
                  ${repeat(
                    value,
                    (stateClass) => stateClass,
                    (stateClass) => {
                      const label = this._stateClassName(stateClass);
                      return html`
                        <ha-input-chip
                          .item=${stateClass}
                          .label=${label}
                          .disabled=${this.disabled}
                          @remove=${this._removeItem}
                          selected
                        >
                          ${label}
                        </ha-input-chip>
                      `;
                    }
                  )}
                </ha-chip-set>
              `
            : nothing
        }
        <ha-generic-picker
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required && !value.length}
          .value=${""}
          .addButtonLabel=${
            this.label ?? localize?.("ui.components.state-class-picker.add")
          }
          .getItems=${this._getItems}
          .notFoundLabel=${this._notFoundLabel}
          .emptyLabel=${emptyLabel}
          @value-changed=${this._itemAdded}
        ></ha-generic-picker>
      `;
    }

    return html`
      <ha-generic-picker
        .label=${
          this.label ??
          localize?.("ui.components.state-class-picker.state_class")
        }
        .value=${this.value as string | undefined}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${emptyLabel}
        @value-changed=${this._valueChanged}
      ></ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value || undefined });
  }

  private _itemAdded(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    const stateClass = ev.detail.value;
    if (!stateClass || this._value.includes(stateClass)) {
      return;
    }
    this._setValue([...this._value, stateClass]);
  }

  private _removeItem(ev: Event) {
    ev.stopPropagation();
    const stateClass = (ev.currentTarget as HTMLElement & { item: string })
      .item;
    this._setValue(this._value.filter((item) => item !== stateClass));
  }

  private _setValue(value: string[]) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-generic-picker {
      display: block;
      width: 100%;
    }
    ha-chip-set {
      padding: 8px 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-class-picker": HaStateClassPicker;
  }
}
