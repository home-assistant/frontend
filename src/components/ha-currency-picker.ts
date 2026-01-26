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
];

const CURRENCIES = [
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BYR",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HRK",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LTL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLL",
  "SOS",
  "SRD",
  "SSP",
  "STD",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "UYU",
  "UZS",
  "VEF",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
  "ZWL",
];

const curSymbol = (currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency })
    .formatToParts(1)
    .find((x) => x.type === "currency")?.value;

export const getCurrencyOptions = (
  locale?: FrontendLocaleData
): PickerComboBoxItem[] => {
  const language = locale?.language ?? "en";
  const currencyDisplayNames = new Intl.DisplayNames(language, {
    type: "currency",
    fallback: "code",
  });

  const options: PickerComboBoxItem[] = CURRENCIES.map((currency) => ({
    id: currency,
    primary: `${currencyDisplayNames.of(currency)} (${curSymbol(currency, language)})`,
    secondary: currency,
  }));

  options.sort((a, b) =>
    caseInsensitiveStringCompare(a.primary, b.primary, language)
  );
  return options;
};

@customElement("ha-currency-picker")
export class HaCurrencyPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  private _getCurrencyOptions = memoizeOne(getCurrencyOptions);

  private _getItems = () => this._getCurrencyOptions(this.hass?.locale);

  private _getCurrencyName = (currency?: string) =>
    this._getItems().find((c) => c.id === currency)?.primary;

  private _valueRenderer = (value: string) =>
    html`<span slot="headline">${this._getCurrencyName(value) ?? value}</span>`;

  protected render() {
    const label =
      this.label ??
      (this.hass?.localize("ui.components.currency-picker.currency") ||
        "Currency");

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this.hass?.localize(
          "ui.components.currency-picker.no_currencies"
        ) || "No currencies available"}
        .label=${label}
        .value=${this.value}
        .valueRenderer=${this._valueRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
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
      ? this.hass.localize("ui.components.currency-picker.no_match", { term })
      : html`No currencies found for ${term}`;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-currency-picker": HaCurrencyPicker;
  }
}
