import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { FrontendLocaleData } from "../data/translation";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

const SEARCH_KEYS = [
  { name: "primary", weight: 10 },
  { name: "secondary", weight: 8 },
  { name: "search_labels.english", weight: 5 },
];

export const COUNTRIES = [
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
];

export const getCountryOptions = (
  countries: string[],
  noSort: boolean,
  locale?: FrontendLocaleData
): PickerComboBoxItem[] => {
  const language = locale?.language ?? "en";
  const countryDisplayNames = new Intl.DisplayNames(language, {
    type: "region",
    fallback: "code",
  });
  const englishDisplayNames = new Intl.DisplayNames("en", {
    type: "region",
    fallback: "code",
  });

  const options: PickerComboBoxItem[] = countries.map((country) => {
    const primary = countryDisplayNames.of(country) ?? country;
    const englishName = englishDisplayNames.of(country) ?? country;
    return {
      id: country,
      primary,
      secondary: country,
      search_labels: {
        english: englishName !== primary ? englishName : null,
      },
    };
  });

  if (!noSort && locale) {
    options.sort((a, b) =>
      caseInsensitiveStringCompare(a.primary, b.primary, locale.language)
    );
  }
  return options;
};

@customElement("ha-country-picker")
export class HaCountryPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Array }) public countries?: string[];

  @property() public helper?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ attribute: "no-sort", type: Boolean }) public noSort = false;

  private _getCountryOptions = memoizeOne(getCountryOptions);

  private _getItems = () =>
    this._getCountryOptions(
      this.countries ?? COUNTRIES,
      this.noSort,
      this.hass?.locale
    );

  private _getCountryName = (country?: string) =>
    this._getItems().find((c) => c.id === country)?.primary;

  private _valueRenderer = (value: string) =>
    html`<span slot="headline">${this._getCountryName(value) ?? value}</span>`;

  protected render() {
    const label =
      this.label ??
      (this.hass?.localize("ui.components.country-picker.country") ||
        "Country");

    const value =
      this.value ??
      (this.required && !this.disabled ? this._getItems()[0]?.id : this.value);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this.hass?.localize(
          "ui.components.country-picker.no_countries"
        ) || "No countries available"}
        .label=${label}
        .value=${value}
        .valueRenderer=${this._valueRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
        .helper=${this.helper}
        .getItems=${this._getItems}
        .searchKeys=${SEARCH_KEYS}
        @value-changed=${this._changed}
        hide-clear-icon
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
    return this.hass
      ? this.hass.localize("ui.components.country-picker.no_match", { term })
      : html`No countries found for ${term}`;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-country-picker": HaCountryPicker;
  }
}
