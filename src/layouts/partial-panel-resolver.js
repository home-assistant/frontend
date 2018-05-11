import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/app-route/app-route.js';
import '../util/hass-mixins.js';
import './hass-loading-screen.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
// import { importHref } from '@polymer/polymer/lib/utils/import-href.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
class PartialPanelResolver extends PolymerElement {
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
      errorLoading: {
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
    this.errorLoading = false;

    importHref(
      panel.url,

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

      () => {
        // a single retry of importHref in the error callback fixes a webkit refresh issue
        if (!this.retrySetPanelForWebkit(panel)) {
          this.errorLoading = true;
        }
      },

      true /* async */
    );
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
