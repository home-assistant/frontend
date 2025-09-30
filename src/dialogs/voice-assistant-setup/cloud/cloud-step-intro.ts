import { mdiEarth, mdiMicrophoneMessage, mdiOpenInNew } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { AssistantSetupStyles } from "../styles";

@customElement("cloud-step-intro")
export class CloudStepIntro extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`<div class="content">
        <img
          src=${`/static/images/logo_nabu_casa${this.hass.themes?.darkMode ? "_dark" : ""}.png`}
          alt="Nabu Casa logo"
        />
        <h1>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.cloud.title"
          )}
        </h1>
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
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.features.remote_access.title"
              )}
              <span class="no-wrap"></span>
            </h2>
            <p>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.features.remote_access.text"
              )}
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
        <ha-button
          href="https://www.nabucasa.com"
          target="_blank"
          rel="noreferrer noopener"
          appearance="plain"
        >
          <ha-svg-icon .path=${mdiOpenInNew} slot="start"></ha-svg-icon>
          nabucasa.com
        </ha-button>
        <ha-button @click=${this._signUp}
          >${this.hass.localize(
            "ui.panel.config.cloud.register.headline"
          )}</ha-button
        >
      </div>`;
  }

  private _signUp() {
    fireEvent(this, "cloud-step", { step: "SIGNUP" });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      :host {
        display: flex;
      }
      .features {
        display: flex;
        flex-direction: column;
        grid-gap: var(--ha-space-4);
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
        font-size: var(--ha-font-size-2xl);
      }
      .access .round-icon {
        color: #00aef8;
        background-color: #cceffe;
      }
      .feature h2 {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
        margin-top: 0;
        margin-bottom: 8px;
      }
      .feature p {
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-normal);
        line-height: var(--ha-line-height-condensed);
        margin: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-step-intro": CloudStepIntro;
  }
}
