import { mdiMenuDown } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { formatLanguageCode } from "../common/language/format_language";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { FrontendLocaleData } from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-button";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

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
      };
    });
  } else if (locale) {
    options = languages.map((lang) => ({
      id: lang,
      primary: formatLanguageCode(lang, locale),
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

  @property() public helper?: string;

  @property({ attribute: "native-name", type: Boolean })
  public nativeName = false;

  @property({ type: Boolean, attribute: "button-style" })
  public buttonStyle = false;

  @property({ attribute: "no-sort", type: Boolean }) public noSort = false;

  @property({ attribute: "inline-arrow", type: Boolean })
  public inlineArrow = false;

  @state() _defaultLanguages: string[] = [];

  @query("ha-generic-picker", true) public genericPicker!: HaGenericPicker;

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

  private _getLanguageName = (lang?: string) =>
    this._getItems().find((language) => language.id === lang)?.primary;

  private _valueRenderer = (value) =>
    html`<span slot="headline"
      >${this._getLanguageName(value) ?? value}</span
    > `;

  protected render() {
    const value =
      this.value ??
      (this.required && !this.disabled ? this._getItems()[0].id : this.value);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        popover-placement="bottom-end"
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this.hass?.localize(
          "ui.components.language-picker.no_languages"
        ) || "No languages available"}
        .placeholder=${this.label ??
        (this.hass?.localize("ui.components.language-picker.language") ||
          "Language")}
        show-label
        .value=${value}
        .valueRenderer=${this._valueRenderer}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .getItems=${this._getItems}
        @value-changed=${this._changed}
        hide-clear-icon
      >
        ${this.buttonStyle
          ? html`<ha-button
              slot="field"
              .disabled=${this.disabled}
              @click=${this._openPicker}
              appearance="plain"
              variant="neutral"
            >
              ${this._getLanguageName(value)}
              <ha-svg-icon slot="end" .path=${mdiMenuDown}></ha-svg-icon>
            </ha-button>`
          : nothing}
      </ha-generic-picker>
    `;
  }

  private _openPicker(ev: Event) {
    ev.stopPropagation();
    this.genericPicker.open();
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
    const term = html`<b>‘${search}’</b>`;
    return this.hass
      ? this.hass.localize("ui.components.language-picker.no_match", {
          term,
        })
      : html`No languages found for ${term}`;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-language-picker": HaLanguagePicker;
  }
}
