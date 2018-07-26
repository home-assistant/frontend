import '@polymer/app-layout/app-drawer-layout/app-drawer-layout.js';
import '@polymer/app-layout/app-drawer/app-drawer.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-media-query/iron-media-query.js';
import '@polymer/iron-pages/iron-pages.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../util/ha-url-sync.js';

import './partial-cards.js';
import './partial-panel-resolver.js';
import EventsMixin from '../mixins/events-mixin.js';
import NavigateMixin from '../mixins/navigate-mixin.js';

import(/* webpackChunkName: "ha-sidebar" */ '../components/ha-sidebar.js');
import(/* webpackChunkName: "more-info-dialog" */ '../dialogs/ha-more-info-dialog.js');
import(/* webpackChunkName: "voice-command-dialog" */ '../dialogs/ha-voice-command-dialog.js');

const NON_SWIPABLE_PANELS = ['kiosk', 'map'];

class HomeAssistantMain extends NavigateMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
  <style>
    :host {
      color: var(--primary-text-color);
      /* remove the grey tap highlights in iOS on the fullscreen touch targets */
      -webkit-tap-highlight-color: rgba(0,0,0,0);
    }
    iron-pages, ha-sidebar {
      /* allow a light tap highlight on the actual interface elements  */
      -webkit-tap-highlight-color: rgba(0,0,0,0.1);
    }
    iron-pages {
      height: 100%;
    }
  </style>
  <ha-more-info-dialog hass="[[hass]]"></ha-more-info-dialog>
  <ha-url-sync hass="[[hass]]"></ha-url-sync>
  <app-route route="{{route}}" pattern="/states" tail="{{statesRouteTail}}"></app-route>
  <ha-voice-command-dialog hass="[[hass]]" id="voiceDialog"></ha-voice-command-dialog>
  <iron-media-query query="(max-width: 870px)" query-matches="{{narrow}}">
  </iron-media-query>

  <app-drawer-layout fullbleed="" force-narrow="[[computeForceNarrow(narrow, dockedSidebar)]]" responsive-width="0">
    <app-drawer id="drawer" slot="drawer" disable-swipe="[[_computeDisableSwipe(hass)]]" swipe-open="[[!_computeDisableSwipe(hass)]]" persistent="[[dockedSidebar]]">
      <ha-sidebar narrow="[[narrow]]" hass="[[hass]]" default-page="[[_defaultPage]]"></ha-sidebar>
    </app-drawer>

    <iron-pages attr-for-selected="id" fallback-selection="panel-resolver" selected="[[hass.panelUrl]]" selected-attribute="panel-visible">
      <partial-cards id="states" narrow="[[narrow]]" hass="[[hass]]" show-menu="[[dockedSidebar]]" route="[[statesRouteTail]]" show-tabs=""></partial-cards>

      <partial-panel-resolver id="panel-resolver" narrow="[[narrow]]" hass="[[hass]]" route="[[route]]" show-menu="[[dockedSidebar]]"></partial-panel-resolver>

    </iron-pages>
  </app-drawer-layout>
`;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      route: {
        type: Object,
        observer: '_routeChanged',
      },
      statesRouteTail: Object,
      dockedSidebar: {
        type: Boolean,
        computed: 'computeDockedSidebar(hass)',
      },
    };
  }

  ready() {
    super.ready();
    this._defaultPage = localStorage.defaultPage || 'states';
    this.addEventListener('hass-open-menu', () => this.handleOpenMenu());
    this.addEventListener('hass-close-menu', () => this.handleCloseMenu());
    this.addEventListener('hass-start-voice', ev => this.handleStartVoice(ev));
  }

  _routeChanged() {
    if (this.narrow) {
      this.$.drawer.close();
    }
  }

  handleStartVoice(ev) {
    ev.stopPropagation();
    this.$.voiceDialog.opened = true;
  }

  handleOpenMenu() {
    if (this.narrow) {
      this.$.drawer.open();
    } else {
      this.fire('hass-dock-sidebar', { dock: true });
    }
  }

  handleCloseMenu() {
    this.$.drawer.close();
    if (this.dockedSidebar) {
      this.fire('hass-dock-sidebar', { dock: false });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (document.location.pathname === '/') {
      this.navigate(`/${localStorage.defaultPage || 'states'}`, true);
    }
  }

  computeForceNarrow(narrow, dockedSidebar) {
    return narrow || !dockedSidebar;
  }

  computeDockedSidebar(hass) {
    return hass.dockedSidebar;
  }

  _computeDisableSwipe(hass) {
    return NON_SWIPABLE_PANELS.indexOf(hass.panelUrl) !== -1;
  }
}

customElements.define('home-assistant-main', HomeAssistantMain);
