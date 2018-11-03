import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/app-route/app-route";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/ha-menu-button";
import "../../../src/resources/ha-style";
import "../hassio-markdown-dialog";
import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-info";
import "./hassio-addon-logs";
import "./hassio-addon-network";

class HassioAddonView extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      :host {
        color: var(--primary-text-color);
        --paper-card-header-color: var(--primary-text-color);
      }
      .content {
        padding: 24px 0 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      hassio-addon-info,
      hassio-addon-network,
      hassio-addon-audio,
      hassio-addon-config {
        margin-bottom: 24px;
        width: 600px;
      }
      hassio-addon-logs {
        max-width: calc(100% - 8px);
        min-width: 600px;
      }
      @media only screen and (max-width: 600px) {
        hassio-addon-info,
        hassio-addon-network,
        hassio-addon-audio,
        hassio-addon-config,
        hassio-addon-logs {
          max-width: 100%;
          min-width: 100%;
        }
      }
    </style>
    <app-route route="[[route]]" pattern="/addon/:slug" data="{{routeData}}" active="{{routeMatches}}"></app-route>
    <app-header-layout has-scrolling-region="">
      <app-header fixed="" slot="header">
        <app-toolbar>
          <ha-menu-button hassio narrow="[[narrow]]" show-menu="[[showMenu]]"></ha-menu-button>
          <paper-icon-button icon="hassio:arrow-left" on-click="backTapped"></paper-icon-button>
          <div main-title="">Hass.io: add-on details</div>
        </app-toolbar>
      </app-header>
      <div class="content">
        <hassio-addon-info hass="[[hass]]" addon="[[addon]]" addon-slug="[[routeData.slug]]"></hassio-addon-info>

        <template is="dom-if" if="[[addon.version]]">
          <hassio-addon-config hass="[[hass]]" addon="[[addon]]" addon-slug="[[routeData.slug]]"></hassio-addon-config>

          <template is="dom-if" if="[[addon.audio]]">
            <hassio-addon-audio hass="[[hass]]" addon="[[addon]]"></hassio-addon-audio>
          </template>

          <template is="dom-if" if="[[addon.network]]">
            <hassio-addon-network hass="[[hass]]" addon="[[addon]]" addon-slug="[[routeData.slug]]"></hassio-addon-network>
          </template>

          <hassio-addon-logs hass="[[hass]]" addon-slug="[[routeData.slug]]"></hassio-addon-logs>
        </template>
      </div>
    </app-header-layout>

    <hassio-markdown-dialog title="[[markdownTitle]]" content="[[markdownContent]]"></hassio-markdown-dialog>
`;
  }

  static get properties() {
    return {
      hass: Object,
      showMenu: Boolean,
      narrow: Boolean,
      route: Object,
      routeData: {
        type: Object,
        observer: "routeDataChanged",
      },
      routeMatches: Boolean,
      addon: Object,

      markdownTitle: String,
      markdownContent: {
        type: String,
        value: "",
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
    this.addEventListener("hassio-markdown-dialog", (ev) =>
      this.openMarkdown(ev)
    );
  }

  apiCalled(ev) {
    const path = ev.detail.path;

    if (!path) return;

    if (path.substr(path.lastIndexOf("/") + 1) === "uninstall") {
      this.backTapped();
    } else {
      this.routeDataChanged(this.routeData);
    }
  }

  routeDataChanged(routeData) {
    if (!this.routeMatches || !routeData || !routeData.slug) return;
    this.hass.callApi("get", `hassio/addons/${routeData.slug}/info`).then(
      (info) => {
        this.addon = info.data;
      },
      () => {
        this.addon = null;
      }
    );
  }

  backTapped() {
    history.back();
  }

  openMarkdown(ev) {
    this.setProperties({
      markdownTitle: ev.detail.title,
      markdownContent: ev.detail.content,
    });
    this.shadowRoot.querySelector("hassio-markdown-dialog").openDialog();
  }
}

customElements.define("hassio-addon-view", HassioAddonView);
