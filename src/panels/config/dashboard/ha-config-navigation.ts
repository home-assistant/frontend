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

const PAGES: Array<{
  page: string;
  core?: boolean;
  advanced?: boolean;
}> = [
  { page: "core", core: true },
  { page: "server_control", core: true },
  { page: "person" },
  { page: "entity_registry", core: true },
  { page: "area_registry", core: true },
  { page: "automation" },
  { page: "script" },
  { page: "zha" },
  { page: "zwave" },
  { page: "customize", core: true, advanced: true },
];

@customElement("ha-config-navigation")
class HaConfigNavigation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public showAdvanced!: boolean;

  protected render(): TemplateResult | void {
    return html`
      <ha-card>
        ${PAGES.map(({ page, core, advanced }) =>
          (core || isComponentLoaded(this.hass, page)) &&
          (!advanced || this.showAdvanced)
            ? html`
                <a href=${`/config/${page}`}>
                  <paper-item>
                    <paper-item-body two-line="">
                      ${this.hass.localize(`ui.panel.config.${page}.caption`)}
                      <div secondary>
                        ${this.hass.localize(
                          `ui.panel.config.${page}.description`
                        )}
                      </div>
                    </paper-item-body>
                    <ha-icon-next></ha-icon-next>
                  </paper-item>
                </a>
              `
            : ""
        )}
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      a {
        text-decoration: none;
        color: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation": HaConfigNavigation;
  }
}
