import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { formatLanguageCode } from "../common/language/format_language";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { FrontendLocaleData } from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-generic-picker";
import "./ha-list-item";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import "./ha-select";

export const getLanguageOptions = (
  languages: string[],
  nativeName: boolean,
  noSort: boolean,
  locale?: FrontendLocaleData
): PickerComboBoxItem[] => {
  let options: PickerComboBoxItem[] = [];

  if (nativeName) {
    const translations = translationMetadata.translations;
    options = languages.map((lang) => {
      let primary = translations[lang]?.nativeName;
      if (!primary) {
        try {
          // this will not work if Intl.DisplayNames is polyfilled, it will return in the language of the user
          primary = new Intl.DisplayNames(lang, {
            type: "language",
            fallback: "code",
          }).of(lang)!;
        } catch (_err) {
          primary = lang;
        }
      }
      return {
        id: lang,
        primary,
        search_labels: [primary],
      };
    });
  } else if (locale) {
    options = languages.map((lang) => ({
      id: lang,
      primary: formatLanguageCode(lang, locale),
      search_labels: [formatLanguageCode(lang, locale)],
    }));
  }

  if (!noSort && locale) {
    options.sort((a, b) =>
      caseInsensitiveStringCompare(a.primary, b.primary, locale.language)
    );
  }
  return options;
};

@customElement("ha-language-picker")
export class HaLanguagePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Array }) public languages?: string[];

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "native-name", type: Boolean })
  public nativeName = false;

  @property({ attribute: "no-sort", type: Boolean }) public noSort = false;

  @property({ attribute: "inline-arrow", type: Boolean })
  public inlineArrow = false;

  @state() _defaultLanguages: string[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._computeDefaultLanguageOptions();
  }

  private _getLanguagesOptions = memoizeOne(getLanguageOptions);

  private _computeDefaultLanguageOptions() {
    this._defaultLanguages = Object.keys(translationMetadata.translations);
  }

  private _getItems = () =>
    this._getLanguagesOptions(
      this.languages ?? this._defaultLanguages,
      this.nativeName,
      this.noSort,
      this.hass?.locale
    );

  private _valueRenderer = (value) => {
    const language = this._getItems().find(
      (lang) => lang.id === value
    )?.primary;
    return html`<span slot="headline">${language ?? value}</span> `;
  };

  protected render() {
    const value =
      this.value ??
      (this.required && !this.disabled ? this._getItems()[0].id : this.value);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        popover-placement="bottom-end"
        .notFoundLabel=${this.hass?.localize(
          "ui.components.language-picker.no_match"
        )}
        .placeholder=${this.label ??
        (this.hass?.localize("ui.components.language-picker.language") ||
          "Language")}
        .value=${value}
        .valueRenderer=${this._valueRenderer}
        .disabled=${this.disabled}
        .getItems=${this._getItems}
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-language-picker": HaLanguagePicker;
  }
}
