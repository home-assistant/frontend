import { mdiMicrophoneMessage, mdiOpenInNew } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
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
            ${this.hass.localize(
              "ui.panel.config.voice_assistants.assistants.cloud.title",
              {
                home_assistant_cloud: html`
                  <span class="no-wrap">Home Assistant Cloud</span>
                `,
              }
            )}
          </h1>
          <div class="features">
            <div class="feature">
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
          <div class="more">
            <ha-button
              appearance="plain"
              size="small"
              href="https://www.nabucasa.com"
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.cloud.and_more"
              )}
              <ha-svg-icon slot="suffix" .path=${mdiOpenInNew}></ha-svg-icon>
            </ha-button>
          </div>
        </div>
        ${isComponentLoaded(this.hass, "cloud")
          ? html`
              <div class="card-actions">
                <a href="/config/cloud/login">
                  <ha-button appearance="plain">
                    ${this.hass.localize(
                      "ui.panel.config.voice_assistants.assistants.cloud.sign_in"
                    )}
                  </ha-button>
                </a>
                <ha-button href="/config/cloud/register" appearance="filled">
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.assistants.cloud.try_one_month"
                  )}
                </ha-button>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  static styles = css`
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
      font-size: var(--ha-font-size-3xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
      text-align: center;
      max-width: 600px;
      margin: 0 auto 8px auto;
    }
    @media (min-width: 800px) {
      .header {
        font-size: var(--ha-font-size-4xl);
        line-height: var(--ha-line-height-condensed);
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
      font-size: var(--ha-font-size-2xl);
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
    .more {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .more a {
      text-decoration: none;
      color: var(--primary-color);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
    }
    .more a ha-svg-icon {
      --mdc-icon-size: 16px;
    }
    .no-wrap {
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-discover": CloudDiscover;
  }
}
