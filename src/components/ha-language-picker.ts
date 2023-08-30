import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { formatLanguageCode } from "../common/language/format_language";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { FrontendLocaleData } from "../data/translation";
import "../resources/intl-polyfill";
import { translationMetadata } from "../resources/translations-metadata";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

@customElement("ha-language-picker")
export class HaLanguagePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public languages?: string[];

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public nativeName = false;

  @property({ type: Boolean }) public noSort = false;

  @state() _defaultLanguages: string[] = [];

  @query("ha-select") private _select!: HaSelect;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._computeDefaultLanguageOptions();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    const localeChanged =
      changedProperties.has("hass") &&
      this.hass &&
      changedProperties.get("hass") &&
      changedProperties.get("hass").locale.language !==
        this.hass.locale.language;
    if (
      changedProperties.has("languages") ||
      changedProperties.has("value") ||
      localeChanged
    ) {
      this._select.layoutOptions();
      if (this._select.value !== this.value) {
        fireEvent(this, "value-changed", { value: this._select.value });
      }
      if (!this.value) {
        return;
      }
      const languageOptions = this._getLanguagesOptions(
        this.languages ?? this._defaultLanguages,
        this.nativeName,
        this.hass?.locale
      );
      const selectedItemIndex = languageOptions.findIndex(
        (option) => option.value === this.value
      );
      if (selectedItemIndex === -1) {
        this.value = undefined;
      }
      if (localeChanged) {
        this._select.select(selectedItemIndex);
      }
    }
  }

  private _getLanguagesOptions = memoizeOne(
    (languages: string[], nativeName: boolean, locale?: FrontendLocaleData) => {
      let options: { label: string; value: string }[] = [];

      if (nativeName) {
        const translations = translationMetadata.translations;
        options = languages.map((lang) => {
          let label = translations[lang]?.nativeName;
          if (!label) {
            try {
              // this will not work if Intl.DisplayNames is polyfilled, it will return in the language of the user
              label = new Intl.DisplayNames(lang, {
                type: "language",
                fallback: "code",
              }).of(lang)!;
            } catch (err) {
              label = lang;
            }
          }
          return {
            value: lang,
            label,
          };
        });
      } else if (locale) {
        options = languages.map((lang) => ({
          value: lang,
          label: formatLanguageCode(lang, locale),
        }));
      }

      if (!this.noSort && locale) {
        options.sort((a, b) =>
          caseInsensitiveStringCompare(a.label, b.label, locale.language)
        );
      }
      return options;
    }
  );

  private _computeDefaultLanguageOptions() {
    this._defaultLanguages = Object.keys(translationMetadata.translations);
  }

  protected render() {
    const languageOptions = this._getLanguagesOptions(
      this.languages ?? this._defaultLanguages,
      this.nativeName,
      this.hass?.locale
    );

    const value =
      this.value ?? (this.required ? languageOptions[0]?.value : this.value);

    return html`
      <ha-select
        .label=${this.label ??
        (this.hass?.localize("ui.components.language-picker.language") ||
          "Language")}
        .value=${value || ""}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${languageOptions.length === 0
          ? html`<ha-list-item value=""
              >${this.hass?.localize(
                "ui.components.language-picker.no_languages"
              ) || "No languages"}</ha-list-item
            >`
          : languageOptions.map(
              (option) => html`
                <ha-list-item .value=${option.value}
                  >${option.label}</ha-list-item
                >
              `
            )}
      </ha-select>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    const target = ev.target as HaSelect;
    if (target.value === "" || target.value === this.value) {
      return;
    }
    this.value = target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-language-picker": HaLanguagePicker;
  }
}
