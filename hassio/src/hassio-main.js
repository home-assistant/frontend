import "@polymer/app-route/app-route";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../src/layouts/hass-loading-screen";
import "./addon-view/hassio-addon-view";
import "./hassio-data";
import "./hassio-pages-with-tabs";

import applyThemesOnElement from "../../src/common/dom/apply_themes_on_element";
import EventsMixin from "../../src/mixins/events-mixin";
import NavigateMixin from "../../src/mixins/navigate-mixin";
import { fireEvent } from "../../src/common/dom/fire_event";

class HassioMain extends EventsMixin(NavigateMixin(PolymerElement)) {
  static get template() {
    return html`
      <app-route
        route="[[route]]"
        pattern="/:page"
        data="{{routeData}}"
      ></app-route>
      <hassio-data
        id="data"
        hass="[[hass]]"
        supervisor="{{supervisorInfo}}"
        homeassistant="{{hassInfo}}"
        host="{{hostInfo}}"
      ></hassio-data>

      <template is="dom-if" if="[[!loaded]]">
        <hass-loading-screen></hass-loading-screen>
      </template>

      <template is="dom-if" if="[[loaded]]">
        <template is="dom-if" if="[[!equalsAddon(routeData.page)]]">
          <hassio-pages-with-tabs
            hass="[[hass]]"
            page="[[routeData.page]]"
            supervisor-info="[[supervisorInfo]]"
            hass-info="[[hassInfo]]"
            host-info="[[hostInfo]]"
          ></hassio-pages-with-tabs>
        </template>
        <template is="dom-if" if="[[equalsAddon(routeData.page)]]">
          <hassio-addon-view
            hass="[[hass]]"
            route="[[route]]"
          ></hassio-addon-view>
        </template>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      route: {
        type: Object,
        // Fake route object
        value: {
          prefix: "/hassio",
          path: "/dashboard",
          __queryParams: {},
        },
        observer: "routeChanged",
      },
      routeData: Object,
      supervisorInfo: Object,
      hostInfo: Object,
      hassInfo: Object,
      loaded: {
        type: Boolean,
        computed: "computeIsLoaded(supervisorInfo, hostInfo, hassInfo)",
      },
    };
  }

  ready() {
    super.ready();
    applyThemesOnElement(this, this.hass.themes, this.hass.selectedTheme, true);
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
    // Paulus - March 17, 2019
    // We went to a single hass-toggle-menu event in HA 0.90. However, the
    // supervisor UI can also run under older versions of Home Assistant.
    // So here we are going to translate toggle events into the appropriate
    // open and close events. These events are a no-op in newer versions of
    // Home Assistant.
    this.addEventListener("hass-toggle-menu", () => {
      fireEvent(
        window.parent.customPanel,
        this.hass.dockedSidebar ? "hass-close-menu" : "hass-open-menu"
      );
    });
    // Paulus - March 19, 2019
    // We changed the navigate event to fire directly on the window, as that's
    // where we are listening for it. However, the older panel_custom will
    // listen on this element for navigation events, so we need to forward them.
    window.addEventListener("location-changed", (ev) =>
      fireEvent(this, ev.type, ev.detail, {
        bubbles: false,
      })
    );
  }

  connectedCallback() {
    super.connectedCallback();
    this.routeChanged(this.route);
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      let tries = 1;

      const tryUpdate = () => {
        this.$.data.refresh().catch(function() {
          tries += 1;
          setTimeout(tryUpdate, Math.min(tries, 5) * 1000);
        });
      };

      tryUpdate();
    }
  }

  computeIsLoaded(supervisorInfo, hostInfo, hassInfo) {
    return supervisorInfo !== null && hostInfo !== null && hassInfo !== null;
  }

  routeChanged(route) {
    if (route.path === "" && route.prefix === "/hassio") {
      this.navigate("/hassio/dashboard", true);
    }
    fireEvent(this, "iron-resize");
  }

  equalsAddon(page) {
    return page && page === "addon";
  }
}

customElements.define("hassio-main", HassioMain);
