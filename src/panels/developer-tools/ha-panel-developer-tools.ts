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

import "../../components/ha-menu-button";
import "../../resources/ha-style";
import "./developer-tools-router";

import scrollToTarget from "../../common/dom/scroll-to-target";

import { haStyle } from "../../resources/styles";
import { HomeAssistant, Route } from "../../types";
import { navigate } from "../../common/navigate";
import isComponentLoaded from "../../common/config/is_component_loaded";

@customElement("ha-panel-developer-tools")
class PanelDeveloperTools extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public narrow!: boolean;

  protected render(): TemplateResult | void {
    const page = this._page;
    return html`
      <app-header-layout has-scrolling-region>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>Developer Tools</div>
          </app-toolbar>
          <paper-tabs
            scrollable
            attr-for-selected="page-name"
            .selected=${page}
            @iron-activate=${this.handlePageSelected}
          >
            <paper-tab page-name="info">
              ${this.hass.localize("panel.dev-info")}
            </paper-tab>
            <paper-tab page-name="event">
              ${this.hass.localize("panel.dev-events")}
            </paper-tab>
            ${isComponentLoaded(this.hass, "mqtt")
              ? html`
                  <paper-tab page-name="mqtt">
                    ${this.hass.localize("panel.dev-mqtt")}
                  </paper-tab>
                `
              : ""}
            <paper-tab page-name="service">
              ${this.hass.localize("panel.dev-services")}
            </paper-tab>
            <paper-tab page-name="state">
              ${this.hass.localize("panel.dev-states")}
            </paper-tab>
            <paper-tab page-name="template">
              ${this.hass.localize("panel.dev-templates")}
            </paper-tab>
          </paper-tabs>
        </app-header>
        <developer-tools-router
          .route=${this.route}
          .narrow=${this.narrow}
          .hass=${this.hass}
        ></developer-tools-router>
      </app-header-layout>
    `;
  }

  private handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this._page) {
      navigate(this, `/developer-tools/${newPage}`);
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
    "ha-panel-developer-tools": PanelDeveloperTools;
  }
}
