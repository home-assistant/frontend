import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { canShowPage } from "../../../common/config/can_show_page";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { HomeAssistant } from "../../../types";

@customElement("ha-config-navigation")
class HaConfigNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public showAdvanced!: boolean;

  @property() public pages!: PageNavigation[];

  protected render(): TemplateResult {
    return html`
      ${this.pages.map((page) =>
        canShowPage(this.hass, page)
          ? html`
              <a href=${page.path} aria-role="option" tabindex="-1">
                <paper-icon-item>
                  <ha-svg-icon
                    .path=${page.iconPath}
                    slot="item-icon"
                  ></ha-svg-icon>
                  <paper-item-body two-line>
                    ${page.name ||
                    this.hass.localize(
                      page.translationKey ||
                        `ui.panel.config.${page.component}.caption`
                    )}
                    ${page.component === "cloud" && (page.info as CloudStatus)
                      ? page.info.logged_in
                        ? html`
                            <div secondary>
                              ${this.hass.localize(
                                "ui.panel.config.cloud.description_login",
                                "email",
                                (page.info as CloudStatusLoggedIn).email
                              )}
                            </div>
                          `
                        : html`
                            <div secondary>
                              ${this.hass.localize(
                                "ui.panel.config.cloud.description_features"
                              )}
                            </div>
                          `
                      : html`
                          <div secondary>
                            ${this.hass.localize(
                              `ui.panel.config.${page.component}.description`
                            )}
                          </div>
                        `}
                  </paper-item-body>
                  <ha-icon-next></ha-icon-next>
                </paper-icon-item>
              </a>
            `
          : ""
      )}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        text-decoration: none;
        color: var(--primary-text-color);
        position: relative;
        display: block;
        outline: 0;
      }
      ha-svg-icon,
      ha-icon-next {
        color: var(--secondary-text-color);
      }
      .iron-selected paper-item::before,
      a:not(.iron-selected):focus::before {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;
        content: "";
        transition: opacity 15ms linear;
        will-change: opacity;
      }
      a:not(.iron-selected):focus::before {
        background-color: currentColor;
        opacity: var(--dark-divider-opacity);
      }
      .iron-selected paper-item:focus::before,
      .iron-selected:focus paper-item::before {
        opacity: 0.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation": HaConfigNavigation;
  }
}
