import '@polymer/app-route/app-route.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '../util/hass-mixins.js';
import './hass-loading-screen.js';
import { importHref } from '../resources/html-import/import-href';

const loaded = {};

function ensureLoaded(panel) {
  if (panel in loaded) return loaded[panel];

  let imported;
  // Name each panel we support here, that way Webpack knows about it.
  switch (panel) {
    case 'config':
      imported = import(/* webpackChunkName: "panel-config" */ '../../panels/config/ha-panel-config.js');
      break;

    case 'dev-event':
      imported = import(/* webpackChunkName: "panel-dev-event" */ '../../panels/dev-event/ha-panel-dev-event.js');
      break;

    case 'dev-info':
      imported = import(/* webpackChunkName: "panel-dev-info" */ '../../panels/dev-info/ha-panel-dev-info.js');
      break;

    case 'dev-mqtt':
      imported = import(/* webpackChunkName: "panel-dev-mqtt" */ '../../panels/dev-mqtt/ha-panel-dev-mqtt.js');
      break;

    case 'dev-service':
      imported = import(/* webpackChunkName: "panel-dev-service" */ '../../panels/dev-service/ha-panel-dev-service.js');
      break;

    case 'dev-state':
      imported = import(/* webpackChunkName: "panel-dev-state" */ '../../panels/dev-state/ha-panel-dev-state.js');
      break;

    case 'dev-template':
      imported = import(/* webpackChunkName: "panel-dev-template" */ '../../panels/dev-template/ha-panel-dev-template.js');
      break;

    case 'hassio':
      imported = import(/* webpackChunkName: "panel-hassio" */ '../../panels/hassio/ha-panel-hassio.js');
      break;

    case 'history':
      imported = import(/* webpackChunkName: "panel-history" */ '../../panels/history/ha-panel-history.js');
      break;

    case 'iframe':
      imported = import(/* webpackChunkName: "panel-iframe" */ '../../panels/iframe/ha-panel-iframe.js');
      break;

    case 'kiosk':
      imported = import(/* webpackChunkName: "panel-kiosk" */ '../../panels/kiosk/ha-panel-kiosk.js');
      break;

    case 'logbook':
      imported = import(/* webpackChunkName: "panel-logbook" */ '../../panels/logbook/ha-panel-logbook.js');
      break;

    case 'mailbox':
      imported = import(/* webpackChunkName: "panel-mailbox" */ '../../panels/mailbox/ha-panel-mailbox.js');
      break;

    case 'map':
      imported = import(/* webpackChunkName: "panel-map" */ '../../panels/map/ha-panel-map.js');
      break;

    case 'shopping-list':
      imported = import(/* webpackChunkName: "panel-shopping-list" */ '../../panels/shopping-list/ha-panel-shopping-list.js');
      break;

    default:
      imported = null;
  }

  if (imported != null) {
    loaded[panel] = imported;
  }

  return imported;
}

class PartialPanelResolver extends window.hassMixins.NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      [hidden] {
        display: none !important;
      }
    </style>
    <app-route route="{{route}}" pattern="/:panel" data="{{routeData}}" tail="{{routeTail}}"></app-route>

    <template is="dom-if" if="[[!resolved]]">
      <hass-loading-screen narrow="[[narrow]]" show-menu="[[showMenu]]"></hass-loading-screen>
    </template>

    <span id="panel" hidden\$="[[!resolved]]"></span>
`;
  }

  static get is() { return 'partial-panel-resolver'; }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: 'updateAttributes',
      },

      narrow: {
        type: Boolean,
        value: false,
        observer: 'updateAttributes',
      },

      showMenu: {
        type: Boolean,
        value: false,
        observer: 'updateAttributes',
      },
      route: Object,
      routeData: Object,
      routeTail: {
        type: Object,
        observer: 'updateAttributes',
      },
      resolved: {
        type: Boolean,
        value: false,
      },
      panel: {
        type: Object,
        computed: 'computeCurrentPanel(hass)',
        observer: 'panelChanged',
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

    this.resolved = false;

    let loadingProm;
    if (panel.url) {
      loadingProm = new Promise((resolve, reject) => importHref(panel.url, resolve, reject));
    } else {
      loadingProm = ensureLoaded(panel.component_name);
    }

    if (loadingProm === null) {
      this.panelLoadError(panel);
      return;
    }

    loadingProm.then(
      () => {
        window.hassUtil.dynamicContentUpdater(this.$.panel, 'ha-panel-' + panel.component_name, {
          hass: this.hass,
          narrow: this.narrow,
          showMenu: this.showMenu,
          route: this.routeTail,
          panel: panel,
        });
        this.resolved = true;
      },

      (err) => {
        /* eslint-disable-next-line */
        console.error('Error loading panel', err);
        // a single retry of importHref in the error callback fixes a webkit refresh issue
        if (!this.retrySetPanelForWebkit(panel)) {
          this.panelLoadError(panel);
        }
      },
    );
  }

  panelLoadError(panel) {
    alert(`I don't know how to resolve panel ${panel.component_name}`);
    this.navigate('/states');
  }

  retrySetPanelForWebkit(panel) {
    if (this._retryingPanelChanged) {
      return false;
    }
    this._retryingPanelChanged = true;
    return this.panelChanged(panel);
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
    return hass.config.panels[hass.panelUrl];
  }
}

customElements.define(PartialPanelResolver.is, PartialPanelResolver);
