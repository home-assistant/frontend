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
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

@customElement("ha-language-picker")
export class HaLanguagePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public supportedLanguages?: string[];

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _defaultLanguageOptions: { value: string; label: string }[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._computeDefaultLanguageOptions();
  }

  private _getLanguagesOptions = memoizeOne(
    (supportedLanguages: string[], language: string) => {
      const languageDisplayNames =
        Intl && "DisplayNames" in Intl
          ? new Intl.DisplayNames(language, {
              type: "language",
              fallback: "code",
            })
          : undefined;

      const options = supportedLanguages.map((lang) => ({
        value: lang,
        label: languageDisplayNames ? languageDisplayNames.of(lang)! : lang,
      }));
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

    const languages = Object.keys(this.hass.translationMetadata.translations);

    this._defaultLanguageOptions = languages.map((lang) => ({
      value: lang,
      label:
        this.hass.translationMetadata.translations[lang]?.nativeName ?? lang,
    }));
  }

  protected render(): TemplateResult {
    const value = this.value;

    const languageOptions = this.supportedLanguages
      ? this._getLanguagesOptions(
          this.supportedLanguages,
          this.hass.locale.language
        )
      : this._defaultLanguageOptions;

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
