import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import "../../components/ha-card";
import "../../components/ha-md-list";
import { isExternal } from "../../data/external";
import "../../layouts/hass-subpage";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import { isMobileClient } from "../../util/is_mobile";
import "./ha-enable-shortcuts-row";
import "./ha-force-narrow-row";
import "./ha-push-notifications-row";
import "./ha-set-suspend-row";
import "./ha-set-vibrate-row";

@customElement("ha-profile-section-browser")
class HaProfileSectionBrowser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/profile"
        .header=${this.hass.localize(
          isExternal
            ? "ui.panel.profile.mobile_app_settings"
            : "ui.panel.profile.browser_settings"
        )}
      >
        <div class="container">
          <ha-card
            .header=${this.hass.localize(
              isExternal
                ? "ui.panel.profile.mobile_app_settings"
                : "ui.panel.profile.browser_settings"
            )}
          >
            <div class="card-content">
              ${this.hass.localize("ui.panel.profile.client_settings_detail")}
            </div>
            <ha-md-list>
              ${this.hass.dockedSidebar !== "auto" || !this.narrow
                ? html`
                    <ha-force-narrow-row
                      .hass=${this.hass}
                    ></ha-force-narrow-row>
                  `
                : ""}
              ${"vibrate" in navigator
                ? html`
                    <ha-set-vibrate-row .hass=${this.hass}></ha-set-vibrate-row>
                  `
                : ""}
              ${!isExternal &&
              isComponentLoaded(this.hass.config, "html5.notify")
                ? html`
                    <ha-push-notifications-row
                      .hass=${this.hass}
                    ></ha-push-notifications-row>
                  `
                : ""}
              <ha-set-suspend-row .hass=${this.hass}></ha-set-suspend-row>
              ${!isMobileClient
                ? html`
                    <ha-enable-shortcuts-row
                      id="shortcuts"
                      .hass=${this.hass}
                    ></ha-enable-shortcuts-row>
                  `
                : ""}
            </ha-md-list>
          </ha-card>
        </div>
      </hass-subpage>
    `;
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

        .container {
          padding: var(--ha-space-2) var(--ha-space-4)
            calc(var(--ha-space-4) + var(--safe-area-inset-bottom));
        }

        ha-card {
          margin: 0 auto var(--ha-space-4);
          max-width: 600px;
        }

        ha-md-list {
          background: none;
          padding-top: 0;
          padding-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-section-browser": HaProfileSectionBrowser;
  }
}
