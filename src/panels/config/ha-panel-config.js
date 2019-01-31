import "@polymer/app-route/app-route";
import "@polymer/iron-media-query/iron-media-query";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../layouts/hass-error-screen";

import isComponentLoaded from "../../common/config/is_component_loaded";
import EventsMixin from "../../mixins/events-mixin";
import NavigateMixin from "../../mixins/navigate-mixin";

import(/* webpackChunkName: "panel-config-area-registry" */ "./area_registry/ha-config-area-registry");
import(/* webpackChunkName: "panel-config-automation" */ "./automation/ha-config-automation");
import(/* webpackChunkName: "panel-config-cloud" */ "./cloud/ha-config-cloud");
import(/* webpackChunkName: "panel-config-config" */ "./config-entries/ha-config-entries");
import(/* webpackChunkName: "panel-config-core" */ "./core/ha-config-core");
import(/* webpackChunkName: "panel-config-customize" */ "./customize/ha-config-customize");
import(/* webpackChunkName: "panel-config-dashboard" */ "./dashboard/ha-config-dashboard");
import(/* webpackChunkName: "panel-config-script" */ "./script/ha-config-script");
import(/* webpackChunkName: "panel-config-entity-registry" */ "./entity_registry/ha-config-entity-registry");
import(/* webpackChunkName: "panel-config-users" */ "./users/ha-config-users");
import(/* webpackChunkName: "panel-config-zha" */ "./zha/ha-config-zha");
import(/* webpackChunkName: "panel-config-zwave" */ "./zwave/ha-config-zwave");

/*
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
class HaPanelConfig extends EventsMixin(NavigateMixin(PolymerElement)) {
  static get template() {
    return html`
      <app-route
        route="[[route]]"
        pattern="/:page"
        data="{{_routeData}}"
      ></app-route>

      <iron-media-query query="(min-width: 1040px)" query-matches="{{wide}}">
      </iron-media-query>
      <iron-media-query
        query="(min-width: 1296px)"
        query-matches="{{wideSidebar}}"
      >
      </iron-media-query>

      <template
        is="dom-if"
        if='[[_equals(_routeData.page, "area_registry")]]'
        restamp
      >
        <ha-config-area-registry
          page-name="area_registry"
          route="[[route]]"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-area-registry>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "core")]]' restamp>
        <ha-config-core
          page-name="core"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-core>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "cloud")]]' restamp>
        <ha-config-cloud
          page-name="cloud"
          route="[[route]]"
          hass="[[hass]]"
          is-wide="[[isWide]]"
          cloud-status="[[_cloudStatus]]"
        ></ha-config-cloud>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "dashboard")]]'>
        <ha-config-dashboard
          page-name="dashboard"
          hass="[[hass]]"
          is-wide="[[isWide]]"
          cloud-status="[[_cloudStatus]]"
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        ></ha-config-dashboard>
      </template>

      <template
        is="dom-if"
        if='[[_equals(_routeData.page, "automation")]]'
        restamp
      >
        <ha-config-automation
          page-name="automation"
          route="[[route]]"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-automation>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "script")]]' restamp>
        <ha-config-script
          page-name="script"
          route="[[route]]"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-script>
      </template>

      <template
        is="dom-if"
        if='[[_equals(_routeData.page, "entity_registry")]]'
        restamp
      >
        <ha-config-entity-registry
          page-name="entity_registry"
          route="[[route]]"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-entity-registry>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "zha")]]' restamp>
        <ha-config-zha
          page-name="zha"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-zha>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "zwave")]]' restamp>
        <ha-config-zwave
          page-name="zwave"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-zwave>
      </template>

      <template
        is="dom-if"
        if='[[_equals(_routeData.page, "customize")]]'
        restamp
      >
        <ha-config-customize
          page-name="customize"
          hass="[[hass]]"
          is-wide="[[isWide]]"
        ></ha-config-customize>
      </template>

      <template
        is="dom-if"
        if='[[_equals(_routeData.page, "integrations")]]'
        restamp
      >
        <ha-config-entries
          route="[[route]]"
          page-name="integrations"
          hass="[[hass]]"
          is-wide="[[isWide]]"
          narrow="[[narrow]]"
        ></ha-config-entries>
      </template>

      <template is="dom-if" if='[[_equals(_routeData.page, "users")]]' restamp>
        <ha-config-users
          page-name="users"
          route="[[route]]"
          hass="[[hass]]"
        ></ha-config-users>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      _cloudStatus: {
        type: Object,
        value: null,
      },

      route: {
        type: Object,
        observer: "_routeChanged",
      },

      _routeData: Object,

      wide: Boolean,
      wideSidebar: Boolean,

      isWide: {
        type: Boolean,
        computed: "computeIsWide(showMenu, wideSidebar, wide)",
      },
    };
  }

  ready() {
    super.ready();
    if (isComponentLoaded(this.hass, "cloud")) {
      this._updateCloudStatus();
    }
    this.addEventListener("ha-refresh-cloud-status", () =>
      this._updateCloudStatus()
    );
  }

  async _updateCloudStatus() {
    this._cloudStatus = await this.hass.callWS({ type: "cloud/status" });

    if (this._cloudStatus.cloud === "connecting") {
      setTimeout(() => this._updateCloudStatus(), 5000);
    }
  }

  computeIsWide(showMenu, wideSidebar, wide) {
    return showMenu ? wideSidebar : wide;
  }

  _routeChanged(route) {
    if (route.path === "" && route.prefix === "/config") {
      this.navigate("/config/dashboard", true);
    }
    this.fire("iron-resize");
  }

  _equals(a, b) {
    return a === b;
  }
}

customElements.define("ha-panel-config", HaPanelConfig);
