import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
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

  @state() _defaultLanguages: string[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._computeDefaultLanguages();
  }

  private _computeDefaultLanguages() {
    if (!this.hass.translationMetadata?.translations) {
      return;
    }
    this._defaultLanguages = Object.keys(
      this.hass.translationMetadata.translations
    );
  }

  protected render(): TemplateResult {
    const value = this.value;

    const languages = this.supportedLanguages ?? this._defaultLanguages;

    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.tts-picker.tts")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${languages.map((language) => {
          const label =
            this.hass.translationMetadata.translations[language]?.nativeName ||
            language;
          return html`
            <ha-list-item .value=${language}>${label}</ha-list-item>
          `;
        })}
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
