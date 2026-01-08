import { customElement, property } from "lit/decorators";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import { voiceAssistants } from "../data/expose";
import { brandsUrl } from "../util/brands-url";

@customElement("voice-assistant-brand-icon")
export class VoiceAssistantBrandicon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public voiceAssistantId!: string;

  protected render() {
    return html`
      <img
        class="logo"
        alt=${voiceAssistants[this.voiceAssistantId].name}
        src=${brandsUrl({
          domain: voiceAssistants[this.voiceAssistantId].domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        })}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .logo {
          position: relative;
          height: 24px;
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-assistant-brand-icon": VoiceAssistantBrandicon;
  }
}
