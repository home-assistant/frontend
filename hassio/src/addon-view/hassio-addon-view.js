import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-info";
import "./hassio-addon-logs";
import "./hassio-addon-network";

class HassioAddonView extends PolymerElement {
  static get template() {
    return html`
      <style>
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
      <hass-subpage header="Hass.io: add-on details" hassio>
        <div class="content">
          <hassio-addon-info
            hass="[[hass]]"
            addon="[[addon]]"
            addon-slug="[[addonSlug]]"
          ></hassio-addon-info>

          <template is="dom-if" if="[[addon.version]]">
            <hassio-addon-config
              hass="[[hass]]"
              addon="[[addon]]"
              addon-slug="[[addonSlug]]"
            ></hassio-addon-config>

            <template is="dom-if" if="[[addon.audio]]">
              <hassio-addon-audio
                hass="[[hass]]"
                addon="[[addon]]"
              ></hassio-addon-audio>
            </template>

            <template is="dom-if" if="[[addon.network]]">
              <hassio-addon-network
                hass="[[hass]]"
                addon="[[addon]]"
                addon-slug="[[addonSlug]]"
              ></hassio-addon-network>
            </template>

            <hassio-addon-logs
              hass="[[hass]]"
              addon-slug="[[addonSlug]]"
            ></hassio-addon-logs>
          </template>
        </div>
      </hass-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      route: {
        type: Object,
        observer: "routeDataChanged",
      },
      addonSlug: {
        type: String,
        computed: "_computeSlug(route)",
      },
      addon: Object,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
  }

  apiCalled(ev) {
    const path = ev.detail.path;

    if (!path) return;

    if (path.substr(path.lastIndexOf("/") + 1) === "uninstall") {
      history.back();
    } else {
      this.routeDataChanged(this.route);
    }
  }

  routeDataChanged(routeData) {
    const addon = routeData.path.substr(1);
    this.hass.callApi("get", `hassio/addons/${addon}/info`).then(
      (info) => {
        this.addon = info.data;
      },
      () => {
        this.addon = null;
      }
    );
  }

  _computeSlug(route) {
    return route.path.substr(1);
  }
}

customElements.define("hassio-addon-view", HassioAddonView);
