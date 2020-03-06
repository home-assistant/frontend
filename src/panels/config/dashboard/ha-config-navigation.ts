import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-icon-item";

import { isComponentLoaded } from "../../../common/config/is_component_loaded";

import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { PageNavigation } from "../../../layouts/hass-tabs-subpage";

@customElement("ha-config-navigation")
class HaConfigNavigation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public showAdvanced!: boolean;
  @property() public pages!: PageNavigation[];

  protected render(): TemplateResult {
    return html`
      ${this.pages.map((page) =>
        (!page.component ||
          page.core ||
          isComponentLoaded(this.hass, page.component)) &&
        (!page.advancedOnly || this.showAdvanced)
          ? html`
              <a
                href=${`/config/${page.component}`}
                aria-role="option"
                tabindex="-1"
              >
                <paper-icon-item>
                  <ha-icon .icon=${page.icon} slot="item-icon"></ha-icon>
                  <paper-item-body two-line>
                    ${this.hass.localize(
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

  static get styles(): CSSResult {
    return css`
      a {
        text-decoration: none;
        color: var(--primary-text-color);
        position: relative;
        display: block;
        outline: 0;
      }
      ha-icon,
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
