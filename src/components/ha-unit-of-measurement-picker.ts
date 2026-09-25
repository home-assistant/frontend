import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
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

  /** Allowed units, `null` means "no unit". `undefined` allows any unit. */
  @property({ attribute: false }) public units?: (string | null)[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  private _items = memoizeOne(
    (
      localize: LocalizeFunc | undefined,
      units: (string | null)[] | undefined
    ): PickerComboBoxItem[] =>
      (units ?? ALL_UNITS)
        .map((unit): PickerComboBoxItem => ({
          id: unit ?? "",
          primary:
            unit ??
            localize?.("ui.components.unit-of-measurement-picker.no_unit") ??
            "No unit",
          sorting_label: unit ?? "",
        }))
        .sort((a, b) => {
          // "No unit" first
          if (a.id === "") return -1;
          if (b.id === "") return 1;
          return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
        })
  );

  private _getItems = () => this._items(this._i18n?.localize, this.units);

  private _notFoundLabel = (search: string) =>
    this._i18n?.localize("ui.components.unit-of-measurement-picker.no_match", {
      term: `'${search}'`,
    }) ?? `No units found for '${search}'`;

  protected render() {
    const localize = this._i18n?.localize;
    const noUnits = this.units !== undefined && this.units.length === 0;
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
    // "No unit" is sent as undefined, so ha-form leaves the key out
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
