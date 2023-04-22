import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { LanguageSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-language-picker";

@customElement("ha-selector-language")
export class HaLanguageSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: LanguageSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-language-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .languages=${this.selector.language?.languages}
        .nativeName=${Boolean(this.selector?.language?.native_name)}
        .noSort=${Boolean(this.selector?.language?.no_sort)}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-language-picker>
    `;
  }

  static styles = css`
    ha-language-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-language": HaLanguageSelector;
  }
}
