import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";

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

export interface ConfigPageNavigation {
  page: string;
  core?: boolean;
  advanced?: boolean;
  info?: any;
}

@customElement("ha-config-navigation")
class HaConfigNavigation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public showAdvanced!: boolean;
  @property() public pages!: ConfigPageNavigation[];
  @property() public curPage!: string;

  protected render(): TemplateResult | void {
    return html`
      <paper-listbox attr-for-selected="data-page" .selected=${this.curPage}>
        ${this.pages.map(({ page, core, advanced, info }) =>
          (core || isComponentLoaded(this.hass, page)) &&
          (!advanced || this.showAdvanced)
            ? html`
                <a
                  href=${`/config/${page}`}
                  aria-role="option"
                  data-page="${page}"
                  tabindex="-1"
                >
                  <paper-item>
                    <paper-item-body two-line>
                      ${this.hass.localize(`ui.panel.config.${page}.caption`)}
                      ${page === "cloud" && (info as CloudStatus)
                        ? info.logged_in
                          ? html`
                              <div secondary>
                                ${this.hass.localize(
                                  "ui.panel.config.cloud.description_login",
                                  "email",
                                  (info as CloudStatusLoggedIn).email
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
                                `ui.panel.config.${page}.description`
                              )}
                            </div>
                          `}
                    </paper-item-body>
                  </paper-item>
                </a>
              `
            : ""
        )}
      </paper-listbox>
    `;
  }

  static get styles(): CSSResult {
    return css`
      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
      .iron-selected paper-item:before {
        border-radius: 4px;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;
        content: "";
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
        transition: opacity 15ms linear;
        will-change: opacity;
      }

      .iron-selected paper-item[pressed]:before {
        opacity: 0.37;
      }
      paper-listbox {
        padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation": HaConfigNavigation;
  }
}
