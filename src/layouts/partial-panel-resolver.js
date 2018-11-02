import "@polymer/app-route/app-route";
import { dom } from "@polymer/polymer/lib/legacy/polymer.dom";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hass-loading-screen";
import "./hass-error-screen";
import { importHref } from "../resources/html-import/import-href";

import dynamicContentUpdater from "../common/dom/dynamic_content_updater";
import NavigateMixin from "../mixins/navigate-mixin";

const loaded = {};

function ensureLoaded(panel) {
  if (panel in loaded) return loaded[panel];

  let imported;
  // Name each panel we support here, that way Webpack knows about it.
  switch (panel) {
    case "config":
      imported = import(/* webpackChunkName: "panel-config" */ "../panels/config/ha-panel-config.js");
      break;

    case "custom":
      imported = import(/* webpackChunkName: "panel-custom" */ "../panels/custom/ha-panel-custom.js");
      break;

    case "dev-event":
      imported = import(/* webpackChunkName: "panel-dev-event" */ "../panels/dev-event/ha-panel-dev-event.js");
      break;

    case "dev-info":
      imported = import(/* webpackChunkName: "panel-dev-info" */ "../panels/dev-info/ha-panel-dev-info.js");
      break;

    case "dev-mqtt":
      imported = import(/* webpackChunkName: "panel-dev-mqtt" */ "../panels/dev-mqtt/ha-panel-dev-mqtt.js");
      break;

    case "dev-service":
      imported = import(/* webpackChunkName: "panel-dev-service" */ "../panels/dev-service/ha-panel-dev-service.js");
      break;

    case "dev-state":
      imported = import(/* webpackChunkName: "panel-dev-state" */ "../panels/dev-state/ha-panel-dev-state.js");
      break;

    case "dev-template":
      imported = import(/* webpackChunkName: "panel-dev-template" */ "../panels/dev-template/ha-panel-dev-template.js");
      break;

    case "lovelace":
      imported = import(/* webpackChunkName: "panel-lovelace" */ "../panels/lovelace/ha-panel-lovelace.js");
      break;

    case "history":
      imported = import(/* webpackChunkName: "panel-history" */ "../panels/history/ha-panel-history.js");
      break;

    case "iframe":
      imported = import(/* webpackChunkName: "panel-iframe" */ "../panels/iframe/ha-panel-iframe.js");
      break;

    case "kiosk":
      imported = import(/* webpackChunkName: "panel-kiosk" */ "../panels/kiosk/ha-panel-kiosk.js");
      break;

    case "logbook":
      imported = import(/* webpackChunkName: "panel-logbook" */ "../panels/logbook/ha-panel-logbook.js");
      break;

    case "mailbox":
      imported = import(/* webpackChunkName: "panel-mailbox" */ "../panels/mailbox/ha-panel-mailbox.js");
      break;

    case "map":
      imported = import(/* webpackChunkName: "panel-map" */ "../panels/map/ha-panel-map.js");
      break;

    case "profile":
      imported = import(/* webpackChunkName: "panel-profile" */ "../panels/profile/ha-panel-profile.js");
      break;

    case "shopping-list":
      imported = import(/* webpackChunkName: "panel-shopping-list" */ "../panels/shopping-list/ha-panel-shopping-list.js");
      break;

    case "calendar":
      imported = import(/* webpackChunkName: "panel-calendar" */ "../panels/calendar/ha-panel-calendar.js");
      break;

    default:
      imported = null;
  }

  if (imported != null) {
    loaded[panel] = imported;
  }

  return imported;
}

/*
 * @appliesMixin NavigateMixin
 */
class PartialPanelResolver extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      [hidden] {
        display: none !important;
      }
    </style>
    <app-route route="{{route}}" pattern="/:panel" data="{{routeData}}" tail="{{routeTail}}"></app-route>

    <template is="dom-if" if="[[_equal(_state, 'loading')]]">
      <hass-loading-screen narrow="[[narrow]]" show-menu="[[showMenu]]"></hass-loading-screen>
    </template>
    <template is="dom-if" if="[[_equal(_state, 'error')]]">
      <hass-error-screen
        title=''
        error="Error while loading this panel."
        narrow="[[narrow]]"
        show-menu="[[showMenu]]"
      ></hass-error-screen>
    </template>

    <span id="panel" hidden$="[[!_equal(_state, 'loaded')]]"></span>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "updateAttributes",
      },

      narrow: {
        type: Boolean,
        value: false,
        observer: "updateAttributes",
      },

      showMenu: {
        type: Boolean,
        value: false,
        observer: "updateAttributes",
      },
      route: Object,
      routeData: Object,
      routeTail: {
        type: Object,
        observer: "updateAttributes",
      },
      _state: {
        type: String,
        value: "loading",
      },
      panel: {
        type: Object,
        computed: "computeCurrentPanel(hass)",
        observer: "panelChanged",
      },
    };
  }

  panelChanged(panel) {
    if (!panel) {
      if (this.$.panel.lastChild) {
        this.$.panel.removeChild(this.$.panel.lastChild);
      }
      return;
    }

    this._state = "loading";

    let loadingProm;
    if (panel.url) {
      loadingProm = new Promise((resolve, reject) =>
        importHref(panel.url, resolve, reject)
      );
    } else {
      loadingProm = ensureLoaded(panel.component_name);
    }

    if (loadingProm === null) {
      this._state = "error";
      return;
    }

    loadingProm.then(
      () => {
        dynamicContentUpdater(
          this.$.panel,
          "ha-panel-" + panel.component_name,
          {
            hass: this.hass,
            narrow: this.narrow,
            showMenu: this.showMenu,
            route: this.routeTail,
            panel: panel,
          }
        );
        this._state = "loaded";
      },
      () => {
        this._state = "error";
      }
    );
  }

  updateAttributes() {
    var customEl = dom(this.$.panel).lastChild;
    if (!customEl) return;
    customEl.hass = this.hass;
    customEl.narrow = this.narrow;
    customEl.showMenu = this.showMenu;
    customEl.route = this.routeTail;
  }

  computeCurrentPanel(hass) {
    return hass.panels[hass.panelUrl];
  }

  _equal(a, b) {
    return a === b;
  }
}

customElements.define("partial-panel-resolver", PartialPanelResolver);
