import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
} from "lit-element";
import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import "../../../layouts/hass-subpage";

import "../../../components/ha-menu-button";
import "./zha-config-dashboard-router";

import scrollToTarget from "../../../common/dom/scroll-to-target";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { navigate } from "../../../common/navigate";

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;

  protected render(): TemplateResult | void {
    const page = this._page;
    return html`
      <hass-subpage header="${this.hass.localize("ui.panel.config.zha.title")}">
        <app-header-layout has-scrolling-region>
          <app-header fixed slot="header">
            <paper-tabs
              scrollable
              attr-for-selected="page-name"
              .selected=${page}
              @iron-activate=${this.handlePageSelected}
            >
              <paper-tab page-name="devices">
                ${this.hass.localize(
                  "ui.panel.config.zha.node_management.header"
                )}
              </paper-tab>
              <paper-tab page-name="network">
                ${this.hass.localize(
                  "ui.panel.config.zha.network_management.header"
                )}
              </paper-tab>
              <paper-tab page-name="groups">
                ${this.hass.localize(
                  "ui.panel.config.zha.groups.manage_groups"
                )}
              </paper-tab>
            </paper-tabs>
          </app-header>
          <zha-config-dashboard-router
            .route=${this.route}
            .narrow=${this.narrow}
            .hass=${this.hass}
            .isWide=${this.isWide}
          ></zha-config-dashboard-router>
        </app-header-layout>
      </hass-subpage>
    `;
  }

  private handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this._page) {
      navigate(this, `/config/zha/${newPage}`);
    }

    scrollToTarget(
      this,
      // @ts-ignore
      this.shadowRoot!.querySelector("app-header-layout").header.scrollTarget
    );
  }

  private get _page() {
    return this.route.path.substr(1);
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          color: var(--primary-text-color);
          --paper-card-header-color: var(--primary-text-color);
        }
        paper-tabs {
          margin-left: 12px;
          --paper-tabs-selection-bar-color: #fff;
          text-transform: uppercase;
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
