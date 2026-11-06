import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { fireEvent } from "../common/dom/fire_event";
import { internationalizationContext } from "../data/context";
import {
  SENSOR_DEVICE_CLASS_UNITS,
  SENSOR_STATE_CLASS_UNITS,
} from "../data/sensor_entity_constants";
import type {
  HomeAssistantInternationalization,
  ValueChangedEvent,
} from "../types";
import "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

const ALL_UNITS: (string | null)[] = [
  ...new Set([
    ...Object.values(SENSOR_DEVICE_CLASS_UNITS).flat(),
    ...Object.values(SENSOR_STATE_CLASS_UNITS).flat(),
  ]),
];

@customElement("ha-unit-of-measurement-picker")
export class HaUnitOfMeasurementPicker extends LitElement {
  @property() public value?: string;

  /** Allowed units, `null` means "no unit" is allowed. `undefined` allows any unit. */
  @property({ attribute: false }) public units?: (string | null)[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  // "No unit" is not an item: it is an empty field, which the picker's clear
  // button already provides and which ha-form leaves out
  private _items = memoizeOne(
    (units: (string | null)[] | undefined): PickerComboBoxItem[] =>
      (units ?? ALL_UNITS)
        .filter((unit): unit is string => unit !== null)
        .map((unit): PickerComboBoxItem => ({
          id: unit,
          primary: unit,
          sorting_label: unit,
        }))
        .sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { sensitivity: "base" })
        )
  );

  private _getItems = () => this._items(this.units);

  private _notFoundLabel = (search: string) =>
    this._i18n?.localize("ui.components.unit-of-measurement-picker.no_match", {
      term: `'${search}'`,
    }) ?? `No units found for '${search}'`;

  protected render() {
    const localize = this._i18n?.localize;
    // Also true when "no unit" is the only allowed value
    const noUnits =
      this.units !== undefined && !this.units.some((unit) => unit !== null);
    const noUnitsLabel = localize?.(
      "ui.components.unit-of-measurement-picker.no_units"
    );

    return html`
      <ha-generic-picker
        .label=${
          this.label ??
          localize?.(
            "ui.components.unit-of-measurement-picker.unit_of_measurement"
          )
        }
        .value=${this.value}
        .helper=${noUnits ? noUnitsLabel : this.helper}
        .disabled=${this.disabled || noUnits}
        .required=${this.required}
        .allowCustomValue=${this.units === undefined}
        .customValueLabel=${localize?.(
          "ui.components.unit-of-measurement-picker.custom_unit"
        )}
        .getItems=${this._getItems}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${noUnitsLabel}
        no-sort
        @value-changed=${this._valueChanged}
      ></ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value || undefined });
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-generic-picker {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-unit-of-measurement-picker": HaUnitOfMeasurementPicker;
  }
}
