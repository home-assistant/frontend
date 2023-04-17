import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { TTSSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-tts-picker";

@customElement("ha-selector-tts")
export class HaTTSSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TTSSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    language?: string;
  };

  protected render() {
    return html`<ha-tts-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .language=${this.selector.tts?.language || this.context?.language}
      .disabled=${this.disabled}
      .required=${this.required}
    ></ha-tts-picker>`;
  }

  static styles = css`
    ha-tts-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-tts": HaTTSSelector;
  }
}
