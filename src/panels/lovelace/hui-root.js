import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/app-route/app-route.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-tabs/paper-tabs.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import scrollToTarget from '../../common/dom/scroll-to-target.js';

import EventsMixin from '../../mixins/events-mixin.js';
import NavigateMixin from '../../mixins/navigate-mixin.js';

import '../../layouts/ha-app-layout.js';
import '../../components/ha-start-voice-button.js';
import '../../components/ha-icon.js';
import { loadModule, loadCSS, loadJS } from '../../common/dom/load_resource.js';
import './hui-unused-entities.js';
import './hui-view.js';
import debounce from '../../common/util/debounce.js';

import createCardElement from './common/create-card-element.js';

// CSS and JS should only be imported once. Modules and HTML are safe.
const CSS_CACHE = {};
const JS_CACHE = {};

class HUIRoot extends NavigateMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include='ha-style'>
      :host {
        -ms-user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
      }

      ha-app-layout {
        min-height: 100%;
      }
      paper-tabs {
        margin-left: 12px;
        --paper-tabs-selection-bar-color: var(--text-primary-color, #FFF);
        text-transform: uppercase;
      }
      app-toolbar a {
        color: var(--text-primary-color, white);
      }
      #view {
        min-height: calc(100vh - 112px);
        /**
         * Since we only set min-height, if child nodes need percentage
         * heights they must use absolute positioning so we need relative
         * positioning here.
         *
         * https://www.w3.org/TR/CSS2/visudet.html#the-height-property
         */
        position: relative;
      }
      #view.tabs-hidden {
        min-height: calc(100vh - 64px);
      }
      paper-item {
        cursor: pointer;
      }
    </style>
    <app-route route="[[route]]" pattern="/:view" data="{{routeData}}"></app-route>
    <ha-app-layout id="layout">
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[_computeTitle(config)]]</div>
          <ha-start-voice-button hass="[[hass]]"></ha-start-voice-button>
          <paper-menu-button
            no-animations
            horizontal-align="right"
            horizontal-offset="-5"
          >
            <paper-icon-button icon="hass:dots-vertical" slot="dropdown-trigger"></paper-icon-button>
            <paper-listbox on-iron-select="_deselect" slot="dropdown-content">
              <paper-item on-click="_handleRefresh">Refresh</paper-item>
              <paper-item on-click="_handleUnusedEntities">Unused entities</paper-item>
              <paper-item on-click="_handleHelp">Help</paper-item>
            </paper-listbox>
          </paper-menu-button>
        </app-toolbar>

        <div sticky hidden$="[[_computeTabsHidden(config.views)]]">
          <paper-tabs scrollable selected="[[_curView]]" on-iron-activate="_handleViewSelected">
            <template is="dom-repeat" items="[[config.views]]">
              <paper-tab>
                <template is="dom-if" if="[[item.icon]]">
                  <ha-icon title$="[[item.title]]" icon="[[item.icon]]"></ha-icon>
                </template>
                <template is="dom-if" if="[[!item.icon]]">
                  [[_computeTabTitle(item.title)]]
                </template>
              </paper-tab>
            </template>
          </paper-tabs>
        </div>
      </app-header>

      <div id='view' on-rebuild-view='_debouncedConfigChanged'></div>
    </app-header-layout>
    `;
  }

  static get properties() {
    return {
      narrow: Boolean,
      showMenu: Boolean,
      hass: {
        type: Object,
        observer: '_hassChanged',
      },
      config: {
        type: Object,
        observer: '_configChanged',
      },
      columns: {
        type: Number,
        observer: '_columnsChanged',
      },

      _curView: {
        type: Number,
        value: 0,
      },

      route: {
        type: Object,
        observer: '_routeChanged'
      },
      routeData: Object
    };
  }

  constructor() {
    super();
    this._debouncedConfigChanged = debounce(() => this._selectView(this._curView), 100);
  }

  _routeChanged(route) {
    const views = this.config && this.config.views;
    if (route.path === '' && route.prefix === '/lovelace' && views) {
      this.navigate(`/lovelace/${views[0].id || 0}`, true);
    } else if (this.routeData.view) {
      const view = this.routeData.view;
      let index = 0;
      for (let i = 0; i < views.length; i++) {
        if (views[i].id === view || i === parseInt(view)) {
          index = i;
          break;
        }
      }
      if (index !== this._curView) this._selectView(index);
    }
  }

  _computeViewId(id, index) {
    return id || index;
  }

  _computeTitle(config) {
    return config.title || 'Home Assistant';
  }

  _computeTabsHidden(views) {
    return views.length < 2;
  }

  _computeTabTitle(title) {
    return title || 'Unnamed view';
  }

  _handleRefresh() {
    this.fire('config-refresh');
  }

  _handleUnusedEntities() {
    this._selectView('unused');
  }

  _deselect(ev) {
    ev.target.selected = null;
  }

  _handleHelp() {
    window.open('https://www.home-assistant.io/lovelace/', '_blank');
  }

  _handleViewSelected(ev) {
    const index = ev.detail.selected;
    if (index !== this._curView) {
      const id = this.config.views[index].id || index;
      this.navigate(`/lovelace/${id}`);
    }
    scrollToTarget(this, this.$.layout.header.scrollTarget);
  }

  _selectView(viewIndex) {
    this._curView = viewIndex;

    // Recreate a new element to clear the applied themes.
    const root = this.$.view;
    if (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    let view;
    let background = this.config.background || '';

    if (viewIndex === 'unused') {
      view = document.createElement('hui-unused-entities');
      view.config = this.config;
    } else {
      const viewConfig = this.config.views[this._curView];
      if (viewConfig.panel) {
        view = createCardElement(viewConfig.cards[0]);
        view.isPanel = true;
      } else {
        view = document.createElement('hui-view');
        view.config = viewConfig;
        view.columns = this.columns;
      }
      if (viewConfig.background) background = viewConfig.background;
    }

    this.$.view.style.background = background;

    view.hass = this.hass;
    root.appendChild(view);
  }

  _hassChanged(hass) {
    if (!this.$.view.lastChild) return;
    this.$.view.lastChild.hass = hass;
  }

  _configChanged(config) {
    this._loadResources(config.resources || []);
    // On config change, recreate the view from scratch.
    this._selectView(this._curView);
    this.$.view.classList.toggle('tabs-hidden', config.views.length < 2);
  }

  _columnsChanged(columns) {
    if (!this.$.view.lastChild) return;
    this.$.view.lastChild.columns = columns;
  }

  _loadResources(resources) {
    resources.forEach((resource) => {
      switch (resource.type) {
        case 'css':
          if (resource.url in CSS_CACHE) break;
          CSS_CACHE[resource.url] = loadCSS(resource.url);
          break;

        case 'js':
          if (resource.url in JS_CACHE) break;
          JS_CACHE[resource.url] = loadJS(resource.url);
          break;

        case 'module':
          loadModule(resource.url);
          break;

        case 'html':
          import(/* webpackChunkName: "import-href-polyfill" */ '../../resources/html-import/import-href.js')
            .then(({ importHref }) => importHref(resource.url));
          break;

        default:
          // eslint-disable-next-line
          console.warn('Unknown resource type specified: ${resource.type}');
      }
    });
  }
}

customElements.define('hui-root', HUIRoot);
