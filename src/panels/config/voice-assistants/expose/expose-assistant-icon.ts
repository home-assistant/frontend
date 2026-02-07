import { mdiAlertCircle } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { slugify } from "../../../../common/string/slugify";
import { voiceAssistants } from "../../../../data/expose";
import type { HomeAssistant } from "../../../../types";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/voice-assistant-brand-icon";

@customElement("voice-assistants-expose-assistant-icon")
export class VoiceAssistantExposeAssistantIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public unsupported = false;

  @property({ type: Boolean }) public manual = false;

  @property() public assistant?:
    | "conversation"
    | "cloud.alexa"
    | "cloud.google_assistant";

  render() {
    if (!this.assistant || !voiceAssistants[this.assistant]) return nothing;
    const id = slugify(this.id) + "-" + this.assistant;
    return html`
      <div class="container" id=${id}>
        <voice-assistant-brand-icon
          style=${styleMap({
            filter: this.manual ? "grayscale(100%)" : undefined,
          })}
          .voiceAssistantId=${this.assistant}
          .hass=${this.hass}
        >
        </voice-assistant-brand-icon>
        ${this.unsupported
          ? html`
              <ha-svg-icon
                .path=${mdiAlertCircle}
                class="unsupported"
              ></ha-svg-icon>
            `
          : nothing}
      </div>
      <ha-tooltip
        for=${id}
        placement="left"
        .disabled=${!this.unsupported && !this.manual}
      >
        ${this.unsupported
          ? this.hass.localize(
              "ui.panel.config.voice_assistants.expose.not_supported"
            )
          : ""}
        ${this.unsupported && this.manual ? html`<br />` : nothing}
        ${this.manual
          ? this.hass.localize(
              "ui.panel.config.voice_assistants.expose.manually_configured"
            )
          : nothing}
      </ha-tooltip>
    `;
  }

  static styles = css`
    .container {
      position: relative;
    }
    .logo {
      position: relative;
      height: 24px;
      margin-right: 16px;
      margin-inline-end: 16px;
      margin-inline-start: initial;
    }
    .unsupported {
      color: var(--error-color);
      position: absolute;
      --mdc-icon-size: 16px;
      right: 10px;
      top: -7px;
      inset-inline-end: 10px;
      inset-inline-start: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-assistants-expose-assistant-icon": VoiceAssistantExposeAssistantIcon;
  }
}
