import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { TTSVoiceSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-tts-voice-picker";

@customElement("ha-selector-tts_voice")
export class HaTTSVoiceSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TTSVoiceSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    language?: string;
    engineId?: string;
  };

  protected render() {
    return html`<ha-tts-voice-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .language=${this.selector.tts_voice?.language || this.context?.language}
      .engineId=${this.selector.tts_voice?.engineId || this.context?.engineId}
      .disabled=${this.disabled}
      .required=${this.required}
    ></ha-tts-voice-picker>`;
  }

  static styles = css`
    ha-tts-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-tts-voice": HaTTSVoiceSelector;
  }
}
