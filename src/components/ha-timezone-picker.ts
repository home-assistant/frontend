import { getTimeZones, timeZonesNames } from "@vvo/tzdb";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { ValueChangedEvent } from "../types";
import "./ha-generic-picker";

import type { PickerComboBoxItem } from "./ha-picker-combo-box";

const SEARCH_KEYS = [
  { name: "primary", weight: 10 },
  { name: "secondary", weight: 8 },
];

// @vvo/tzdb is missing the bare "UTC" zone, even though it is a valid IANA
// identifier and a common server default. Add UTC back so a
// "UTC" configuration can be selected.
const ADDITIONAL_TIMEZONES: PickerComboBoxItem[] = [
  { id: "UTC", primary: "+00:00 UTC", secondary: "UTC" },
];

export const getTimezoneOptions = (): PickerComboBoxItem[] => {
  const options: PickerComboBoxItem[] = Array.from(
    new Map(
      getTimeZones({ includeUtc: true })
        .flatMap((timezone) => {
          const groupArray = Array.isArray(timezone.group)
            ? timezone.group
            : [timezone.group];
          const filteredGroup = groupArray.filter((gName) =>
            timeZonesNames.includes(gName)
          );

          return [timezone.name, ...filteredGroup].map((nameString) => ({
            id: nameString,
            primary: timezone.rawFormat,
            secondary: nameString,
          }));
        })
        .map((item) => [item.id, item])
    ).values()
  );

  for (const timezone of ADDITIONAL_TIMEZONES) {
    if (!options.some((option) => option.id === timezone.id)) {
      options.push(timezone);
    }
  }
  return options;
};

@customElement("ha-timezone-picker")
export class HaTimeZonePicker extends LitElement {
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean, attribute: "hide-clear-icon" })
  public hideClearIcon = false;

  private _getTimezoneOptions = memoizeOne(getTimezoneOptions);

  private _getItems = () => this._getTimezoneOptions();

  private _getTimezoneName = (tz?: string) =>
    this._getItems().find((t) => t.id === tz)?.primary;

  private _valueRenderer = (value: string) =>
    html`<span slot="headline">${this._getTimezoneName(value) ?? value}</span>`;

  protected render() {
    const label =
      this.label ??
      (this._localize("ui.components.timezone-picker.time_zone") ||
        "Time zone");

    return html`
      <ha-generic-picker
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${
          this._localize("ui.components.timezone-picker.no_timezones") ||
          "No time zones available"
        }
        .label=${label}
        .helper=${this.helper}
        .placeholder=${this.placeholder}
        .value=${this.value}
        .valueRenderer=${this._valueRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
        .getItems=${this._getItems}
        .searchKeys=${SEARCH_KEYS}
        .hideClearIcon=${this.hideClearIcon}
        @value-changed=${this._changed}
      ></ha-generic-picker>
    `;
  }

  static styles = css`
    ha-generic-picker {
      width: 100%;
      min-width: 200px;
      display: block;
    }
  `;

  private _changed(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    this.value = ev.detail.value;
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _notFoundLabel = (search: string) => {
    const term = html`<b>'${search}'</b>`;
    return (
      this._localize("ui.components.timezone-picker.no_match", { term }) ||
      html`No time zones found for ${term}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timezone-picker": HaTimeZonePicker;
  }
}
