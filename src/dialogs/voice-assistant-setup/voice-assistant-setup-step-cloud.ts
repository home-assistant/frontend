import { mdiEarth, mdiMicrophoneMessage, mdiOpenInNew } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-cloud")
export class HaVoiceAssistantSetupStepCloud extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected override render() {
    return html`<div class="content">
        <img
          src=${`/static/images/logo_nabu_casa${this.hass.themes?.darkMode ? "_dark" : ""}.png`}
          alt="Nabu Casa logo"
        />
        <h1>The power of Home Assistant Cloud</h1>
        <div class="features">
          <div class="feature speech">
            <div class="logos">
              <div class="round-icon">
                <ha-svg-icon .path=${mdiMicrophoneMessage}></ha-svg-icon>
              </div>
            </div>
            <h2>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.features.speech.title"
              )}
              <span class="no-wrap"></span>
            </h2>
            <p>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.features.speech.text"
              )}
            </p>
          </div>
          <div class="feature access">
            <div class="logos">
              <div class="round-icon">
                <ha-svg-icon .path=${mdiEarth}></ha-svg-icon>
              </div>
            </div>
            <h2>
              Remote access
              <span class="no-wrap"></span>
            </h2>
            <p>
              Secure remote access to your system while supporting the
              development of Home Assistant.
            </p>
          </div>
          <div class="feature">
            <div class="logos">
              <img
                alt="Google Assistant"
                src=${brandsUrl({
                  domain: "google_assistant",
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
              />
              <img
                alt="Amazon Alexa"
                src=${brandsUrl({
                  domain: "alexa",
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
              />
            </div>
            <h2>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.features.assistants.title"
              )}
            </h2>
            <p>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.features.assistants.text"
              )}
            </p>
          </div>
        </div>
      </div>
      <div class="footer side-by-side">
        <a
          href="https://www.nabucasa.com"
          target="_blank"
          rel="noreferrer noopenner"
        >
          <ha-button>
            <ha-svg-icon .path=${mdiOpenInNew} slot="icon"></ha-svg-icon>
            nabucasa.com
          </ha-button>
        </a>
        <a href="/config/cloud/register" @click=${this._close}
          ><ha-button unelevated>Try 1 month for free</ha-button></a
        >
      </div>`;
  }

  private _close() {
    fireEvent(this, "closed");
  }

  static styles = [
    AssistantSetupStyles,
    css`
      .features {
        display: flex;
        flex-direction: column;
        grid-gap: 16px;
        padding: 16px;
      }
      .feature {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 16px;
      }
      .feature .logos {
        margin-bottom: 16px;
      }
      .feature .logos > * {
        width: 40px;
        height: 40px;
        margin: 0 4px;
      }
      .round-icon {
        border-radius: 50%;
        color: #6e41ab;
        background-color: #e8dcf7;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      .access .round-icon {
        color: #00aef8;
        background-color: #cceffe;
      }
      .feature h2 {
        font-weight: 500;
        font-size: 16px;
        line-height: 24px;
        margin-top: 0;
        margin-bottom: 8px;
      }
      .feature p {
        font-weight: 400;
        font-size: 14px;
        line-height: 20px;
        margin: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-cloud": HaVoiceAssistantSetupStepCloud;
  }
}
