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

import "../../src/components/ha-menu-button";
import "../../src/resources/ha-style";
import "./hassio-tabs-router";

import scrollToTarget from "../../src/common/dom/scroll-to-target";

import { haStyle } from "../../src/resources/styles";
import { HomeAssistant, Route } from "../../src/types";
import { navigate } from "../../src/common/navigate";
import {
  HassioSupervisorInfo,
  HassioHostInfo,
  HassioHomeAssistantInfo,
  HassioHassOSInfo,
} from "../../src/data/hassio";

const HAS_REFRESH_BUTTON = ["store", "snapshots"];

@customElement("hassio-pages-with-tabs")
class HassioPagesWithTabs extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() public supervisorInfo!: HassioSupervisorInfo;
  @property() public hostInfo!: HassioHostInfo;
  @property() public hassInfo!: HassioHomeAssistantInfo;
  @property() public hassOsInfo!: HassioHassOSInfo;

  protected render(): TemplateResult | void {
    const page = this._page;
    return html`
      <app-header-layout has-scrolling-region>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
              hassio
            ></ha-menu-button>
            <div main-title>Hass.io</div>
            ${HAS_REFRESH_BUTTON.includes(page)
              ? html`
                  <paper-icon-button
                    icon="hassio:refresh"
                    @click=${this.refreshClicked}
                  ></paper-icon-button>
                `
              : undefined}
          </app-toolbar>
          <paper-tabs
            scrollable
            attr-for-selected="page-name"
            .selected=${page}
            @iron-activate=${this.handlePageSelected}
          >
            <paper-tab page-name="dashboard">Dashboard</paper-tab>
            <paper-tab page-name="snapshots">Snapshots</paper-tab>
            <paper-tab page-name="store">Add-on store</paper-tab>
            <paper-tab page-name="system">System</paper-tab>
          </paper-tabs>
        </app-header>
        <hassio-tabs-router
          .route=${this.route}
          .hass=${this.hass}
          .supervisorInfo=${this.supervisorInfo}
          .hostInfo=${this.hostInfo}
          .hassInfo=${this.hassInfo}
          .hassOsInfo=${this.hassOsInfo}
        ></hassio-tabs-router>
      </app-header-layout>
    `;
  }

  private handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this._page) {
      navigate(this, `/hassio/${newPage}`);
    }

    scrollToTarget(
      this,
      // @ts-ignore
      this.shadowRoot!.querySelector("app-header-layout").header.scrollTarget
    );
  }

  private refreshClicked() {
    if (this._page === "snapshots") {
      // @ts-ignore
      this.shadowRoot.querySelector("hassio-snapshots").refreshData();
    } else {
      // @ts-ignore
      this.shadowRoot.querySelector("hassio-addon-store").refreshData();
    }
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
        app-header,
        app-toolbar {
          background-color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-pages-with-tabs": HassioPagesWithTabs;
  }
}
