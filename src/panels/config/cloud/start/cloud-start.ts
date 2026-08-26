import {
  mdiBackupRestore,
  mdiCellphone,
  mdiEarth,
  mdiHandHeart,
  mdiMicrophone,
  mdiMicrophoneMessage,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../cloud-signed-out-menu";
import { cloudSignedOutStyle } from "../cloud-signed-out-style";
import { cloudSubpageStyle } from "../account/cloud-subpage-style";

const FEATURES = [
  { icon: mdiHandHeart, color: "--red-color", key: "feature_support" },
  { icon: mdiEarth, color: "--blue-color", key: "feature_remote" },
  { icon: mdiBackupRestore, color: "--green-color", key: "feature_backup" },
  {
    icon: mdiMicrophoneMessage,
    color: "--cyan-color",
    key: "feature_voice_control",
  },
  {
    icon: mdiMicrophone,
    color: "--purple-color",
    key: "feature_voice_quality",
  },
  { icon: mdiCellphone, color: "--primary-color", key: "feature_companion" },
] as const;

@customElement("cloud-start")
export class CloudStart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .header=${this.hass.localize(
          "ui.panel.config.cloud.login.landing_title"
        )}
      >
        <cloud-signed-out-menu
          slot="toolbar-icon"
          .hass=${this.hass}
        ></cloud-signed-out-menu>
        <div class="content">
          <div class="landing">
            <div class="pitch">
              <h2>
                ${this.hass.localize("ui.panel.config.cloud.login.hero_title")}
              </h2>
              <p class="lead">
                ${this.hass.localize("ui.panel.config.cloud.login.hero_lead")}
              </p>
            </div>

            <ha-card outlined class="features">
              <div class="card-content feature-list">
                ${FEATURES.map(
                  (feature) => html`
                    <div class="feature">
                      <div
                        class="icon-tile"
                        style=${styleMap({
                          "--feature-tint": `var(${feature.color})`,
                        })}
                      >
                        <ha-svg-icon .path=${feature.icon}></ha-svg-icon>
                      </div>
                      <div class="feature-text">
                        <div class="feature-title">
                          ${this.hass.localize(
                            `ui.panel.config.cloud.login.${feature.key}_title`
                          )}
                        </div>
                        <p>
                          ${this.hass.localize(
                            `ui.panel.config.cloud.login.${feature.key}_body`
                          )}
                        </p>
                      </div>
                    </div>
                  `
                )}
              </div>
            </ha-card>

            <div class="actions">
              <div class="action-buttons">
                <ha-button
                  size="l"
                  appearance="accent"
                  @click=${this._handleRegister}
                >
                  ${this.hass.localize(
                    "ui.panel.config.cloud.register.headline"
                  )}
                </ha-button>
                <ha-button appearance="plain" @click=${this._handleSignIn}>
                  ${this.hass.localize("ui.panel.config.cloud.login.sign_in")}
                </ha-button>
              </div>
              <p class="trial-note">
                ${this.hass.localize("ui.panel.config.cloud.login.trial_note")}
              </p>
            </div>
          </div>

          <p class="footnote">
            ${this.hass.localize("ui.panel.config.cloud.login.partner_note", {
              nabu_casa_link: html`<a
                href="https://www.nabucasa.com"
                target="_blank"
                rel="noreferrer"
                >Nabu&nbsp;Casa,&nbsp;Inc</a
              >`,
            })}
          </p>
        </div>
      </hass-subpage>
    `;
  }

  private _handleSignIn() {
    navigate("/config/cloud/login");
  }

  private _handleRegister() {
    navigate("/config/cloud/register");
  }

  static get styles() {
    return [
      haStyle,
      cloudSubpageStyle,
      cloudSignedOutStyle,
      css`
        .content {
          min-height: 100%;
          gap: var(--ha-space-4);
          container-type: inline-size;
        }

        .landing {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-5);
          width: 100%;
          max-width: 600px;
          margin-inline: auto;
        }

        .pitch .lead {
          margin: var(--ha-space-2) 0 0;
          line-height: var(--ha-line-height-normal);
          color: var(--secondary-text-color);
          text-wrap: pretty;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-5);
          padding: var(--ha-space-5) var(--ha-space-4);
        }
        .feature {
          display: flex;
          gap: var(--ha-space-3);
          align-items: flex-start;
        }
        .feature-title {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        .feature-text p {
          margin: var(--ha-space-1) 0 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-normal);
          text-wrap: pretty;
        }
        .icon-tile {
          width: 40px;
          height: 40px;
          border-radius: var(--ha-border-radius-pill);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--feature-tint) 15%, transparent);
          color: var(--feature-tint);
        }

        /* Keeps the primary action reachable while the feature list scrolls. */
        .actions {
          position: sticky;
          bottom: 0;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
          padding: var(--ha-space-3) 0
            calc(var(--safe-area-inset-bottom) + var(--ha-space-3));
          background: var(--primary-background-color);
          box-shadow: 0 -1px 0 var(--divider-color);
        }
        .action-buttons {
          display: flex;
          gap: var(--ha-space-2);
        }
        .action-buttons ha-button {
          flex: 1;
          /* Matches the primary action's size="l" height without also giving
             the secondary its larger type. */
          --ha-button-height: 48px;
        }
        .trial-note {
          margin: 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          text-align: center;
        }

        .footnote {
          width: 100%;
          max-width: 960px;
          /* Keep the footer at the bottom on short pages. */
          margin: auto auto 0;
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          text-align: center;
          text-wrap: pretty;
        }
        .footnote a {
          color: var(--primary-color);
        }

        @container (min-width: 700px) {
          .landing {
            display: grid;
            grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
            grid-template-rows: auto auto 1fr;
            column-gap: var(--ha-space-7);
            row-gap: var(--ha-space-6);
            align-items: start;
            max-width: 960px;
          }
          .pitch {
            grid-column: 1;
            grid-row: 1;
          }
          .actions {
            grid-column: 1;
            grid-row: 2;
            position: static;
            padding: 0;
            background: none;
            box-shadow: none;
          }
          .features {
            grid-column: 2;
            grid-row: 1 / 4;
          }
          .action-buttons {
            flex-direction: column;
            max-width: 340px;
          }
          .action-buttons ha-button {
            flex: initial;
            width: 100%;
          }
          .trial-note {
            text-align: start;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-start": CloudStart;
  }
}
