import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { cloudSubpageStyle } from "./cloud-subpage-style";

@customElement("cloud-companion-pref")
export class CloudCompanionPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.cloud.account.companion.title"
        )}
        back-path="/config/cloud/account"
      >
        <div class="content">
          <ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.cloud.account.companion.connected_title"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.companion.connected_intro"
                )}
              </p>
              <ul>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.companion.bullet_sensors"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.companion.bullet_presence"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.companion.bullet_alerts"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.companion.bullet_secure"
                  )}
                </li>
                <li>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.companion.bullet_push"
                  )}
                </li>
              </ul>
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href="https://companion.home-assistant.io/"
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.companion.learn_more"
                )}
              </ha-button>
            </div>
          </ha-card>

          <ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.cloud.account.companion.webhook_title"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.companion.webhook_info_one"
                )}
              </p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.companion.webhook_info_two"
                )}
              </p>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  static styles = [
    haStyle,
    cloudSubpageStyle,
    css`
      .card-content p,
      .card-content li {
        color: var(--secondary-text-color);
      }
      ul {
        padding-left: var(--ha-space-6);
        padding-inline-start: var(--ha-space-6);
        padding-inline-end: initial;
        margin: 0;
      }
      li {
        margin-bottom: var(--ha-space-2);
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-companion-pref": CloudCompanionPref;
  }
}
