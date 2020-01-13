import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-scroll-effects/effects/waterfall";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/app-route/app-route";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/iron-pages/iron-pages";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";

import "@material/mwc-button/mwc-button";

import "../../components/ha-cards";
import "../../components/ha-icon";
import "../../components/ha-menu-button";

import "../../layouts/ha-app-layout";

import { extractViews } from "../../common/entity/extract_views";
import { getViewEntities } from "../../common/entity/get_view_entities";
import { computeStateName } from "../../common/entity/compute_state_name";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import computeLocationName from "../../common/config/location_name";
import NavigateMixin from "../../mixins/navigate-mixin";
import { EventsMixin } from "../../mixins/events-mixin";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { isComponentLoaded } from "../../common/config/is_component_loaded";

const DEFAULT_VIEW_ENTITY_ID = "group.default_view";
const ALWAYS_SHOW_DOMAIN = ["persistent_notification", "configurator"];

/*
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
class PartialCards extends EventsMixin(NavigateMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex iron-positioning ha-style">
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }

        ha-app-layout {
          min-height: 100%;
          background-color: var(--secondary-background-color, #e5e5e5);
        }

        iron-pages {
          height: 100%;
        }

        paper-tabs {
          margin-left: 12px;
          --paper-tabs-selection-bar-color: var(--text-primary-color, #fff);
          text-transform: uppercase;
        }

        mwc-button {
          --mdc-theme-primary: var(--error-color, red);
        }

        a {
          text-decoration: none;
        }
      </style>
      <app-route
        route="{{route}}"
        pattern="/:view"
        data="{{routeData}}"
        active="{{routeMatch}}"
      ></app-route>
      <ha-app-layout id="layout">
        <app-header effects="waterfall" condenses="" fixed="" slot="header">
          <app-toolbar>
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title="">
              [[computeTitle(views, defaultView, locationName)]]
            </div>
            <paper-icon-button
              hidden$="[[!conversation]]"
              aria-label="Start conversation"
              icon="hass:microphone"
              on-click="_showVoiceCommandDialog"
            ></paper-icon-button>
            <a
              href="https://github.com/home-assistant/home-assistant-polymer/issues/4459"
              ><mwc-button unelevated>DEPRECATED</mwc-button></a
            >
          </app-toolbar>

          <div sticky="" hidden$="[[areTabsHidden(views, showTabs)]]">
            <paper-tabs
              scrollable=""
              selected="[[currentView]]"
              attr-for-selected="data-entity"
              on-iron-activate="handleViewSelected"
            >
              <paper-tab data-entity="" on-click="scrollToTop">
                <template is="dom-if" if="[[!defaultView]]">
                  Home
                </template>
                <template is="dom-if" if="[[defaultView]]">
                  <template is="dom-if" if="[[defaultView.attributes.icon]]">
                    <ha-icon
                      title$="[[_computeStateName(defaultView)]]"
                      icon="[[defaultView.attributes.icon]]"
                    ></ha-icon>
                  </template>
                  <template is="dom-if" if="[[!defaultView.attributes.icon]]">
                    [[_computeStateName(defaultView)]]
                  </template>
                </template>
              </paper-tab>
              <template is="dom-repeat" items="[[views]]">
                <paper-tab
                  data-entity$="[[item.entity_id]]"
                  on-click="scrollToTop"
                >
                  <template is="dom-if" if="[[item.attributes.icon]]">
                    <ha-icon
                      title$="[[_computeStateName(item)]]"
                      icon="[[item.attributes.icon]]"
                    ></ha-icon>
                  </template>
                  <template is="dom-if" if="[[!item.attributes.icon]]">
                    [[_computeStateName(item)]]
                  </template>
                </paper-tab>
              </template>
            </paper-tabs>
          </div>
        </app-header>

        <iron-pages
          attr-for-selected="data-view"
          selected="[[currentView]]"
          selected-attribute="view-visible"
        >
          <ha-cards
            data-view=""
            states="[[viewStates]]"
            columns="[[_columns]]"
            hass="[[hass]]"
            panel-visible="[[panelVisible]]"
            ordered-group-entities="[[orderedGroupEntities]]"
          ></ha-cards>

          <template is="dom-repeat" items="[[views]]">
            <ha-cards
              data-view$="[[item.entity_id]]"
              states="[[viewStates]]"
              columns="[[_columns]]"
              hass="[[hass]]"
              panel-visible="[[panelVisible]]"
              ordered-group-entities="[[orderedGroupEntities]]"
            ></ha-cards>
          </template>
        </iron-pages>
      </ha-app-layout>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        value: null,
        observer: "hassChanged",
      },

      narrow: {
        type: Boolean,
        value: false,
      },

      panelVisible: {
        type: Boolean,
        value: false,
      },

      route: Object,
      routeData: Object,
      routeMatch: Boolean,

      _columns: {
        type: Number,
        value: 1,
      },

      conversation: {
        type: Boolean,
        computed: "_computeConversation(hass)",
      },

      locationName: {
        type: String,
        value: "",
        computed: "_computeLocationName(hass)",
      },

      currentView: {
        type: String,
        computed: "_computeCurrentView(hass, routeMatch, routeData)",
      },

      views: {
        type: Array,
      },

      defaultView: {
        type: Object,
      },

      viewStates: {
        type: Object,
        computed: "computeViewStates(currentView, hass, defaultView)",
      },

      orderedGroupEntities: {
        type: Array,
        computed: "computeOrderedGroupEntities(currentView, hass, defaultView)",
      },

      showTabs: {
        type: Boolean,
        value: true,
      },
    };
  }

  static get observers() {
    return ["_updateColumns(narrow, hass.dockedSidebar)"];
  }

  ready() {
    this._updateColumns = this._updateColumns.bind(this);
    this.mqls = [300, 600, 900, 1200].map((width) =>
      matchMedia(`(min-width: ${width}px)`)
    );
    super.ready();
  }

  connectedCallback() {
    super.connectedCallback();
    this.mqls.forEach((mql) => mql.addListener(this._updateColumns));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.mqls.forEach((mql) => mql.removeListener(this._updateColumns));
  }

  _updateColumns() {
    const matchColumns = this.mqls.reduce((cols, mql) => cols + mql.matches, 0);
    // Do -1 column if the menu is docked and open
    this._columns = Math.max(
      1,
      matchColumns - (!this.narrow && this.hass.dockedSidebar === "docked")
    );
  }

  _computeConversation(hass) {
    return isComponentLoaded(hass, "conversation");
  }

  _showVoiceCommandDialog() {
    showVoiceCommandDialog(this);
  }

  areTabsHidden(views, showTabs) {
    return !views || !views.length || !showTabs;
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
  scrollToTop() {
    // the scroll event will trigger _updateScrollState directly,
    // However, _updateScrollState relies on the previous `scrollTop` to update the states.
    // Calling _updateScrollState will ensure that the states are synced correctly.
    var top = 0;
    var scroller = this.$.layout.header.scrollTarget;
    var easingFn = function easeOutQuad(t, b, c, d) {
      /* eslint-disable no-param-reassign, space-infix-ops, no-mixed-operators */
      t /= d;
      return -c * t * (t - 2) + b;
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
        scroller.scrollTop = easingFn(
          elapsedTime,
          currentScrollTop,
          deltaScrollTop,
          duration
        );
        requestAnimationFrame(updateFrame.bind(this));
      }
    }.call(this));
  }

  handleViewSelected(ev) {
    const view = ev.detail.item.getAttribute("data-entity") || null;

    if (view !== this.currentView) {
      let path = "/states";
      if (view) {
        path += "/" + view;
      }
      this.navigate(path);
    }
  }

  _computeCurrentView(hass, routeMatch, routeData) {
    if (!routeMatch) return "";
    if (
      !hass.states[routeData.view] ||
      !hass.states[routeData.view].attributes.view
    ) {
      return "";
    }
    return routeData.view;
  }

  computeTitle(views, defaultView, locationName) {
    return (views &&
      views.length > 0 &&
      !defaultView &&
      locationName === "Home") ||
      !locationName
      ? "Home Assistant"
      : locationName;
  }

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }

  _computeLocationName(hass) {
    return computeLocationName(hass);
  }

  hassChanged(hass) {
    if (!hass) return;
    const views = extractViews(hass.states);
    let defaultView = null;
    // If default view present, it's in first index.
    if (views.length > 0 && views[0].entity_id === DEFAULT_VIEW_ENTITY_ID) {
      defaultView = views.shift();
    }

    this.setProperties({ views, defaultView });
  }

  isView(currentView, defaultView) {
    return (
      (currentView || defaultView) &&
      this.hass.states[currentView || DEFAULT_VIEW_ENTITY_ID]
    );
  }

  _defaultViewFilter(hass, entityId) {
    // Filter out hidden
    return !hass.states[entityId].attributes.hidden;
  }

  _computeDefaultViewStates(hass, entityIds) {
    const states = {};
    entityIds
      .filter(this._defaultViewFilter.bind(null, hass))
      .forEach((entityId) => {
        states[entityId] = hass.states[entityId];
      });
    return states;
  }

  /*
    Compute the states to show for current view.

    Will make sure we always show entities from ALWAYS_SHOW_DOMAINS domains.
  */
  computeViewStates(currentView, hass, defaultView) {
    const entityIds = Object.keys(hass.states);

    // If we base off all entities, only have to filter out hidden
    if (!this.isView(currentView, defaultView)) {
      return this._computeDefaultViewStates(hass, entityIds);
    }

    let states;
    if (currentView) {
      states = getViewEntities(hass.states, hass.states[currentView]);
    } else {
      states = getViewEntities(
        hass.states,
        hass.states[DEFAULT_VIEW_ENTITY_ID]
      );
    }

    // Make sure certain domains are always shown.
    entityIds.forEach((entityId) => {
      const state = hass.states[entityId];

      if (ALWAYS_SHOW_DOMAIN.includes(computeStateDomain(state))) {
        states[entityId] = state;
      }
    });

    return states;
  }

  /*
    Compute the ordered list of groups for this view
  */
  computeOrderedGroupEntities(currentView, hass, defaultView) {
    if (!this.isView(currentView, defaultView)) {
      return null;
    }

    var orderedGroupEntities = {};
    var entitiesList =
      hass.states[currentView || DEFAULT_VIEW_ENTITY_ID].attributes.entity_id;

    for (var i = 0; i < entitiesList.length; i++) {
      orderedGroupEntities[entitiesList[i]] = i;
    }

    return orderedGroupEntities;
  }
}

customElements.define("ha-panel-states", PartialCards);
