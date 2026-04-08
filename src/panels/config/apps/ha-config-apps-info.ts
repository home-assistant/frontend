import { mdiOpenInNew, mdiPuzzle } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import { saveFrontendUserData } from "../../../data/frontend";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { navigate } from "../../../common/navigate";

@customElement("ha-config-apps-info")
class HaConfigAppsInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.dashboard.apps.main")}
      >
        <div class="content">
          <ha-card outlined>
            <div class="card-content">
              <div class="header">
                <ha-svg-icon class="icon" .path=${mdiPuzzle}></ha-svg-icon>
                <h1>
                  ${this.hass.localize(
                    "ui.panel.config.apps.info.what_is_an_app"
                  )}
                </h1>
              </div>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.apps.info.what_is_an_app_description"
                )}
              </p>
            </div>
          </ha-card>

          <ha-card outlined>
            <div class="card-content">
              <h2>
                ${this.hass.localize(
                  "ui.panel.config.apps.info.why_not_available"
                )}
              </h2>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.apps.info.why_not_available_description"
                )}
              </p>
              <ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.panel.config.apps.info.installation_hint"
                )}
              </ha-alert>
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href=${documentationUrl(this.hass, "/apps/")}
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize("ui.panel.config.apps.info.learn_more")}
                <ha-svg-icon slot="icon" .path=${mdiOpenInNew}></ha-svg-icon>
              </ha-button>
              <ha-button @click=${this._dismiss} variant="danger">
                ${this.hass.localize("ui.panel.config.apps.info.dismiss")}
              </ha-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _dismiss(): Promise<void> {
    try {
      await saveFrontendUserData(this.hass.connection, "core", {
        ...this.hass.userData,
        apps_info_dismissed: true,
      });
    } catch (err) {
      showAlertDialog(this, { text: (err as Error).message });
      return;
    }
    navigate("/config", { replace: true });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: var(--ha-space-4);
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }

        .card-content {
          padding: var(--ha-space-4);
        }

        .header {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          margin-bottom: var(--ha-space-4);
        }

        .icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          color: var(--primary-color);
        }

        h1 {
          margin: 0;
          font-size: var(--ha-font-size-xl);
          font-weight: 500;
        }

        h2 {
          margin: 0 0 var(--ha-space-3);
          font-size: var(--ha-font-size-l);
          font-weight: 500;
        }

        p {
          margin: 0 0 var(--ha-space-3);
          line-height: var(--ha-line-height-normal);
          color: var(--secondary-text-color);
        }

        ha-alert {
          display: block;
          margin-top: var(--ha-space-2);
        }

        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--ha-space-2);
          padding: var(--ha-space-2);
          border-top: var(--ha-border-width-sm) solid var(--divider-color);
        }

        a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-info": HaConfigAppsInfo;
  }
}
