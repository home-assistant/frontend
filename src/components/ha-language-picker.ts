import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { formatLanguageCode } from "../common/language/format_language";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

@customElement("ha-language-picker")
export class HaLanguagePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public languages?: string[];

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public nativeName = false;

  @state() _defaultLanguages: string[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._computeDefaultLanguageOptions();
  }

  private _getLanguagesOptions = memoizeOne(
    (languages: string[], language: string, nativeName: boolean) => {
      let options: { label: string; value: string }[] = [];

      if (nativeName) {
        const translations = this.hass.translationMetadata.translations;
        options = languages.map((lang) => ({
          value: lang,
          label: translations[lang]?.nativeName ?? lang,
        }));
      } else {
        options = languages.map((lang) => ({
          value: lang,
          label: formatLanguageCode(lang, this.hass.locale),
        }));
      }

      options.sort((a, b) =>
        caseInsensitiveStringCompare(a.label, b.label, language)
      );
      return options;
    }
  );

  private _computeDefaultLanguageOptions() {
    if (!this.hass.translationMetadata?.translations) {
      return;
    }

    this._defaultLanguages = Object.keys(
      this.hass.translationMetadata.translations
    );
  }

  protected render(): TemplateResult {
    const value = this.value;

    const languageOptions = this._getLanguagesOptions(
      this.languages ?? this._defaultLanguages,
      this.hass.locale.language,
      this.nativeName
    );

    return html`
      <ha-select
        .label=${this.label}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${languageOptions.map(
          (option) => html`
            <ha-list-item .value=${option.value}>${option.label}</ha-list-item>
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
    this.value = target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-language-picker": HaLanguagePicker;
  }
}
