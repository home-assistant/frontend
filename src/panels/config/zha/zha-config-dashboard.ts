import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../layouts/hass-subpage";
import "../ha-config-section";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  private pages: string[] = ["network", "devices", "groups"];

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage header=${this.hass.localize("ui.panel.config.zha.title")}>
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zha.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize("ui.panel.config.zha.introduction")}
          </div>

          <ha-card>
            ${this.pages.map((page) => {
              return html`
                <a href=${`/config/zha/${page}`}>
                  <paper-item>
                    <paper-item-body two-line="">
                      ${this.hass.localize(
                        `ui.panel.config.zha.${page}.caption`
                      )}
                      <div secondary>
                        ${this.hass.localize(
                          `ui.panel.config.zha.${page}.description`
                        )}
                      </div>
                    </paper-item-body>
                    <ha-icon-next></ha-icon-next>
                  </paper-item>
                </a>
              `;
            })}
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard": ZHAConfigDashboard;
  }
}
