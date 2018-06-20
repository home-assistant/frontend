import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/iron-icon/iron-icon.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import EventsMixin from '../../mixins/events-mixin.js';
import '../../layouts/ha-app-layout.js';
import './hui-view.js';

class HUIRoot extends EventsMixin(PolymerElement) {
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
    </style>
    <ha-app-layout id="layout">
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[_computeTitle(config)]]</div>
          <a href='https://developers.home-assistant.io/docs/en/lovelace_index.html' tabindex='-1' target='_blank'>
            <paper-icon-button icon='hass:help-circle-outline'></paper-icon-button>
          </a>
          <paper-icon-button icon='hass:refresh' on-click='_handleRefresh'></paper-icon-button>
        </app-toolbar>

        <div sticky hidden$="[[_computeTabsHidden(config.views)]]">
          <paper-tabs scrollable selected="[[_curView]]" on-iron-activate="_handleViewSelected">
            <template is="dom-repeat" items="[[config.views]]">
              <paper-tab on-click="_scrollToTop">
                <template is="dom-if" if="[[item.tab_icon]]">
                  <iron-icon title$="[[item.name]]" icon="[[item.tab_icon]]"></iron-icon>
                </template>
                <template is="dom-if" if="[[!item.tab_icon]]">
                  [[_computeTabTitle(item)]]
                </template>
              </paper-tab>
            </template>
          </paper-tabs>
        </div>
      </app-header>

      <span id='view'></span>
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
      }
    };
  }

  ready() {
    super.ready();
    this._selectView(0);
  }

  _computeTitle(config) {
    return config.title || 'Experimental UI';
  }

  _computeTabsHidden(views) {
    return views.length < 2;
  }

  _computeTabTitle(view) {
    return view.tab_title || view.name || 'Unnamed View';
  }

  _handleRefresh() {
    this.fire('config-refresh');
  }

  _handleViewSelected(ev) {
    this._selectView(ev.detail.selected);
  }

  _selectView(viewIndex) {
    this._curView = viewIndex;

    // Recreate a new element to clear the applied themes.
    const root = this.$.view;
    if (root.lastChild) {
      root.removeChild(root.lastChild);
    }
    const view = document.createElement('hui-view');
    view.setProperties({
      hass: this.hass,
      config: this.config.views[this._curView],
      columns: this.columns,
    });
    root.appendChild(view);
  }

  _hassChanged(hass) {
    if (!this.$.view.lastChild) return;
    this.$.view.lastChild.hass = hass;
  }

  _configChanged() {
    // On config change, recreate the view from scratch.
    this._selectView(this._curView);
  }

  _columnsChanged(columns) {
    if (!this.$.view.lastChild) return;
    this.$.view.lastChild.columns = columns;
  }


  /**
   * Scroll to a specific y coordinate.
   *
   * Copied from paper-scroll-header-panel.
   *
   * @method scroll
   * @param {number} top The coordinate to scroll to, along the y-axis.
   * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
   */
  _scrollToTop() {
    // the scroll event will trigger _updateScrollState directly,
    // However, _updateScrollState relies on the previous `scrollTop` to update the states.
    // Calling _updateScrollState will ensure that the states are synced correctly.
    var top = 0;
    var scroller = this.$.layout.header.scrollTarget;
    var easingFn = function easeOutQuad(t, b, c, d) {
      /* eslint-disable no-param-reassign, space-infix-ops, no-mixed-operators */
      t /= d;
      return -c * t*(t-2) + b;
      /* eslint-enable no-param-reassign, space-infix-ops, no-mixed-operators */
    };
    var animationId = Math.random();
    var duration = 200;
    var startTime = Date.now();
    var currentScrollTop = scroller.scrollTop;
    var deltaScrollTop = top - currentScrollTop;
    this._currentAnimationId = animationId;
    (function updateFrame() {
      var now = Date.now();
      var elapsedTime = now - startTime;
      if (elapsedTime > duration) {
        scroller.scrollTop = top;
      } else if (this._currentAnimationId === animationId) {
        scroller.scrollTop = easingFn(elapsedTime, currentScrollTop, deltaScrollTop, duration);
        requestAnimationFrame(updateFrame.bind(this));
      }
    }).call(this);
  }
}

customElements.define('hui-root', HUIRoot);
