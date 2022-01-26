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

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public pages!: PageNavigation[];

  protected render(): TemplateResult {
    return html`
      ${this.pages.map((page) =>
        (
          page.path === "#external-app-configuration"
            ? this.hass.auth.external?.config.hasSettingsScreen
            : canShowPage(this.hass, page)
        )
          ? html`
              <a href=${page.path} role="option" tabindex="-1">
                <paper-icon-item @click=${this._entryClicked}>
                  <div
                    class=${page.iconColor ? "icon-background" : ""}
                    slot="item-icon"
                    .style="background-color: ${page.iconColor || "undefined"}"
                  >
                    <ha-svg-icon .path=${page.iconPath}></ha-svg-icon>
                  </div>
                  <paper-item-body two-line>
                    ${page.name ||
                    this.hass.localize(
                      `ui.panel.config.dashboard.${page.translationKey}.title`
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
                            ${page.description ||
                            this.hass.localize(
                              `ui.panel.config.dashboard.${page.translationKey}.description`
                            )}
                          </div>
                        `}
                  </paper-item-body>
                  ${!this.narrow ? html`<ha-icon-next></ha-icon-next>` : ""}
                </paper-icon-item>
              </a>
            `
          : ""
      )}
    `;
  }

  private _entryClicked(ev) {
    ev.currentTarget.blur();
    if (
      ev.currentTarget.parentElement.href.endsWith(
        "#external-app-configuration"
      )
    ) {
      ev.preventDefault();
      this.hass.auth.external!.fireMessage({
        type: "config_screen/show",
      });
    }
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
        height: 24px;
        width: 24px;
      }
      ha-svg-icon {
        padding: 8px;
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
      .icon-background {
        border-radius: 50%;
      }
      .icon-background ha-svg-icon {
        color: #fff;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation": HaConfigNavigation;
  }
}
