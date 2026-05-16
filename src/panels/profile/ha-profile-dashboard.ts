import {
  mdiAccount,
  mdiCellphone,
  mdiEarth,
  mdiLock,
  mdiMonitor,
  mdiTune,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-card";
import "../../components/ha-navigation-list";
import "../../components/ha-svg-icon";
import { isExternal } from "../../data/external";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import "../../layouts/hass-subpage";
import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";

@customElement("ha-profile-dashboard")
class HaProfileDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult {
    const pages: PageNavigation[] = [
      {
        path: "/profile/preferences",
        name: this.hass.localize("ui.panel.profile.user_preferences_header"),
        description: this.hass.localize(
          "ui.panel.profile.user_preferences_description"
        ),
        iconPath: mdiTune,
      },
      {
        path: "/profile/localization",
        name: this.hass.localize("ui.panel.profile.localization_header"),
        description: this.hass.localize(
          "ui.panel.profile.localization_description"
        ),
        iconPath: mdiEarth,
      },
      {
        path: "/profile/browser",
        name: this.hass.localize(
          isExternal
            ? "ui.panel.profile.mobile_app_settings"
            : "ui.panel.profile.browser_settings"
        ),
        description: this.hass.localize("ui.panel.profile.browser_description"),
        iconPath: isExternal ? mdiCellphone : mdiMonitor,
      },
      {
        path: "/profile/security",
        name: this.hass.localize("ui.panel.profile.tabs.security"),
        description: this.hass.localize(
          "ui.panel.profile.security_description"
        ),
        iconPath: mdiLock,
      },
    ];

    return html`
      <hass-subpage
        main-page
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("panel.profile")}
      >
        <div class="content">
          <ha-card>
            <div class="card-content">
              <div class="heading">
                <div class="icon">
                  <ha-svg-icon .path=${mdiAccount}></ha-svg-icon>
                </div>
                <div class="details">
                  ${this.hass.user!.name}
                  ${this.hass.user!.is_owner
                    ? html`<br /><small
                          >${this.hass.localize(
                            "ui.panel.profile.is_owner"
                          )}</small
                        >`
                    : ""}
                </div>
                <ha-button
                  variant="danger"
                  appearance="plain"
                  @click=${this._handleLogOut}
                >
                  ${this.hass.localize("ui.panel.profile.logout")}
                </ha-button>
              </div>
            </div>
          </ha-card>
          <ha-card outlined>
            <ha-navigation-list
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${pages}
              has-secondary
              .label=${this.hass.localize("panel.profile")}
            ></ha-navigation-list>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _handleLogOut() {
    showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.profile.logout_title"),
      text: this.hass.localize("ui.panel.profile.logout_text"),
      confirmText: this.hass.localize("ui.panel.profile.logout"),
      confirm: () => fireEvent(this, "hass-logout"),
      destructive: true,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: var(--safe-area-inset-bottom);
        }

        .content > * {
          display: block;
          margin: 24px 0;
        }

        ha-card[outlined] {
          overflow: hidden;
        }

        .heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: var(--ha-space-10);
          height: var(--ha-space-10);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--primary-color);
          opacity: 0.2;
        }

        .icon ha-svg-icon {
          color: var(--primary-color);
          width: var(--ha-space-6);
          height: var(--ha-space-6);
        }

        .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .details small {
          font-size: var(--ha-font-size-m);
          color: var(--secondary-text-color);
        }

        ha-button {
          margin-inline-start: auto;
          flex-shrink: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-dashboard": HaProfileDashboard;
  }
}
