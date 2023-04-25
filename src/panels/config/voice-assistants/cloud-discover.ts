import { mdiMicrophoneMessage, mdiOpenInNew } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "../../../components/ha-svg-icon";
import "../../../components/ha-button";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

@customElement("cloud-discover")
export class CloudDiscover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-card outlined>
        <div class="card-content">
          <h1 class="header">
            Get the best assistant with Home Assistant Cloud
          </h1>
          <div class="features">
            <div class="feature">
              <div class="logos">
                <img
                  alt="Google Assistant"
                  src=${brandsUrl({
                    domain: "google_assistant",
                    type: "icon",
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  referrerpolicy="no-referrer"
                />
                <img
                  alt="Amazon Alexa"
                  src=${brandsUrl({
                    domain: "alexa",
                    type: "icon",
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  referrerpolicy="no-referrer"
                />
              </div>
              <h2>Amazon Alexa and Google Assistant</h2>
              <p>
                Control all your Home Assistant devices via any Alexa-enabled or
                Google Assistant-enabled device.
              </p>
            </div>
            <div class="feature">
              <div class="logos">
                <div class="round-icon">
                  <ha-svg-icon .path=${mdiMicrophoneMessage}></ha-svg-icon>
                </div>
              </div>
              <h2>Better speech options</h2>
              <p>
                Bring personality to your home by having it speak to you using
                our neural-network powered speech-to-text and text-to-speech
                services.
              </p>
            </div>
          </div>
          <div class="more">
            <a href="https://www.nabucasa.com" target="_blank" rel="noreferrer">
              And more<ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
            </a>
          </div>
        </div>
        ${isComponentLoaded(this.hass, "cloud")
          ? html`
              <div class="card-actions">
                <a href="/config/cloud/register">
                  <ha-button unelevated>Try 1 month for free</ha-button>
                </a>
                <a href="/config/cloud/login">
                  <ha-button>Sign in</ha-button>
                </a>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        display: flex;
        flex-direction: column;
      }
      .card-content {
        padding: 24px 16px;
      }
      .card-actions {
        display: flex;
        justify-content: space-between;
      }
      .header {
        font-weight: 400;
        font-size: 28px;
        line-height: 36px;
        text-align: center;
        max-width: 600px;
        margin: 0 auto 8px auto;
      }
      @media (min-width: 800px) {
        .header {
          font-size: 32px;
          line-height: 40px;
          margin-bottom: 16px;
        }
      }
      .features {
        display: grid;
        grid-template-columns: auto;
        grid-gap: 16px;
        padding: 16px;
      }
      @media (min-width: 600px) {
        .features {
          grid-template-columns: repeat(2, 1fr);
        }
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
      .more {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .more a {
        text-decoration: none;
        color: var(--primary-color);
        font-weight: 500;
        font-size: 14px;
      }
      .more a ha-svg-icon {
        --mdc-icon-size: 16px;
        margin-inline-start: 8px;
        margin-inline-end: initial;
        margin-left: 8px;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-discover": CloudDiscover;
  }
}
