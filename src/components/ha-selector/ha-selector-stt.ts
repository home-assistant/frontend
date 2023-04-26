import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { STTSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-stt-picker";

@customElement("ha-selector-stt")
export class HaSTTSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: STTSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    language?: string;
  };

  protected render() {
    return html`<ha-stt-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      .helper=${this.helper}
      .language=${this.selector.stt?.language || this.context?.language}
      .disabled=${this.disabled}
      .required=${this.required}
    ></ha-stt-picker>`;
  }

  static styles = css`
    ha-stt-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-stt": HaSTTSelector;
  }
}
