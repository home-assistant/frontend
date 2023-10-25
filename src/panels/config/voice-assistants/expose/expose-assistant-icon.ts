import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { mdiAlertCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { voiceAssistants } from "../../../../data/expose";
import { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import "../../../../components/ha-svg-icon";

@customElement("voice-assistants-expose-assistant-icon")
export class VoiceAssistantExposeAssistantIcon extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ type: Boolean }) public unsupported!: boolean;

  @property({ type: Boolean }) public manual?: boolean;

  @property() public assistant?:
    | "conversation"
    | "cloud.alexa"
    | "cloud.google_assistant";

  render() {
    if (!this.assistant || !voiceAssistants[this.assistant]) return nothing;

    return html`
      <div class="container">
        <img
          class="logo"
          style=${styleMap({
            filter: this.manual ? "grayscale(100%)" : undefined,
          })}
          alt=${voiceAssistants[this.assistant].name}
          src=${brandsUrl({
            domain: voiceAssistants[this.assistant].domain,
            type: "icon",
            darkOptimized: this.hass.themes?.darkMode,
          })}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          slot="prefix"
        />
        ${this.unsupported
          ? html`
              <ha-svg-icon
                .path=${mdiAlertCircle}
                class="unsupported"
              ></ha-svg-icon>
            `
          : nothing}
        ${this.manual || this.unsupported
          ? html`
              <simple-tooltip
                animation-delay="0"
                position="top"
                offset="4"
                fitToVisibleBounds
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
              </simple-tooltip>
            `
          : ""}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        position: relative;
      }
      .logo {
        position: relative;
        height: 24px;
        margin-right: 16px;
      }
      .unsupported {
        color: var(--error-color);
        position: absolute;
        --mdc-icon-size: 16px;
        right: 10px;
        top: -7px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-assistants-expose-assistant-icon": VoiceAssistantExposeAssistantIcon;
  }
}
