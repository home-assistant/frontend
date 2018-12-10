import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-scroll-effects/effects/waterfall";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/app-route/app-route";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import scrollToTarget from "../../common/dom/scroll-to-target";

import EventsMixin from "../../mixins/events-mixin";
import localizeMixin from "../../mixins/localize-mixin";
import NavigateMixin from "../../mixins/navigate-mixin";

import "../../layouts/ha-app-layout";
import "../../components/ha-start-voice-button";
import "../../components/ha-icon";
import { loadModule, loadCSS, loadJS } from "../../common/dom/load_resource";
import { subscribeNotifications } from "../../data/ws-notifications";
import { computeNotifications } from "./common/compute-notifications";
import "./components/notifications/hui-notification-drawer";
import "./components/notifications/hui-notifications-button";
import "./hui-unused-entities";
import "./hui-view";
import debounce from "../../common/util/debounce";
import createCardElement from "./common/create-card-element";
import { showEditViewDialog } from "./editor/view-editor/show-edit-view-dialog";

// CSS and JS should only be imported once. Modules and HTML are safe.
const CSS_CACHE = {};
const JS_CACHE = {};

class HUIRoot extends NavigateMixin(
  EventsMixin(localizeMixin(PolymerElement))
) {
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
      paper-tab.iron-selected .edit-view-icon{
        display: inline-flex;
      }
      .edit-view-icon {
        padding-left: 8px;
        display: none;
      }
      #add-view {
        position: absolute;
        height: 44px;
      }
      #add-view ha-icon {
        background-color: var(--accent-color);
        border-radius: 5px;
        margin-top: 4px;
      }
      app-toolbar a {
        color: var(--text-primary-color, white);
      }
      paper-button.warning:not([disabled]) {
        color: var(--google-red-500);
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
    <hui-notification-drawer
      hass="[[hass]]"
      notifications="[[_notifications]]"
      open="{{notificationsOpen}}"
      narrow="[[narrow]]"
    ></hui-notification-drawer>
    <ha-app-layout id="layout">
      <app-header slot="header" effects="waterfall" fixed condenses>
        <template is='dom-if' if="[[!_editMode]]">
          <app-toolbar>
            <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
            <div main-title>[[_computeTitle(config)]]</div>
            <hui-notifications-button
              hass="[[hass]]"
              notifications-open="{{notificationsOpen}}"
              notifications="[[_notifications]]"
            ></hui-notifications-button>
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
                <paper-item on-click="_editModeEnable">[[localize("ui.panel.lovelace.editor.configure_ui")]] (alpha)</paper-item>
                <paper-item on-click="_handleHelp">Help</paper-item>
              </paper-listbox>
            </paper-menu-button>
          </app-toolbar>
        </template>
        <template is='dom-if' if="[[_editMode]]">
          <app-toolbar>
            <paper-icon-button
              icon='hass:close'
              on-click='_editModeDisable'
            ></paper-icon-button>
            <div main-title>[[localize("ui.panel.lovelace.editor.header")]]</div>
          </app-toolbar>
        </template>

        <div sticky hidden$="[[_computeTabsHidden(config.views, _editMode)]]">
          <paper-tabs scrollable selected="[[_curView]]" on-iron-activate="_handleViewSelected">
            <template is="dom-repeat" items="[[config.views]]">
              <paper-tab>
                <template is="dom-if" if="[[item.icon]]">
                  <ha-icon title$="[[item.title]]" icon="[[item.icon]]"></ha-icon>
                </template>
                <template is="dom-if" if="[[!item.icon]]">
                  [[_computeTabTitle(item.title)]]
                </template>
                <template is='dom-if' if="[[_editMode]]">
                 <ha-icon class="edit-view-icon" on-click="_editView" icon="hass:pencil"></ha-icon>
                </template>
              </paper-tab>
            </template>
            <template is='dom-if' if="[[_editMode]]">
              <paper-button id="add-view" on-click="_addView">
                <ha-icon title=[[localize("ui.panel.lovelace.editor.edit_view.add")]] icon="hass:plus"></ha-icon>
              </paper-button>
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
        observer: "_hassChanged",
      },
      config: {
        type: Object,
        computed: "_computeConfig(lovelace)",
        observer: "_configChanged",
      },
      lovelace: {
        type: Object,
      },
      columns: {
        type: Number,
        observer: "_columnsChanged",
      },

      _curView: {
        type: Number,
        value: 0,
      },

      route: {
        type: Object,
        observer: "_routeChanged",
      },

      notificationsOpen: {
        type: Boolean,
        value: false,
      },

      _persistentNotifications: {
        type: Array,
        value: [],
      },

      _notifications: {
        type: Array,
        computed: "_updateNotifications(hass.states, _persistentNotifications)",
      },

      _editMode: {
        type: Boolean,
        value: false,
        computed: "_computeEditMode(lovelace)",
        observer: "_editModeChanged",
      },

      routeData: Object,
    };
  }

  constructor() {
    super();
    this._debouncedConfigChanged = debounce(
      () => this._selectView(this._curView),
      100
    );
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubNotifications = subscribeNotifications(
      this.hass.connection,
      (notifications) => {
        this._persistentNotifications = notifications;
      }
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (typeof this._unsubNotifications === "function") {
      this._unsubNotifications();
    }
  }

  _updateNotifications(states, persistent) {
    if (!states) return persistent;

    const configurator = computeNotifications(states);
    return persistent.concat(configurator);
  }

  _routeChanged(route) {
    const views = this.config && this.config.views;
    if (route.path === "" && route.prefix === "/lovelace" && views) {
      this.navigate(`/lovelace/${views[0].path || 0}`, true);
    } else if (this.routeData.view) {
      const view = this.routeData.view;
      let index = 0;
      for (let i = 0; i < views.length; i++) {
        if (views[i].path === view || i === parseInt(view)) {
          index = i;
          break;
        }
      }
      if (index !== this._curView) this._selectView(index);
    }
  }

  _computeViewPath(path, index) {
    return path || index;
  }

  _computeTitle(config) {
    return config.title || "Home Assistant";
  }

  _computeTabsHidden(views, editMode) {
    return views.length < 2 && !editMode;
  }

  _computeTabTitle(title) {
    return title || "Unnamed view";
  }

  _handleRefresh() {
    this.fire("config-refresh");
  }

  _handleUnusedEntities() {
    this._selectView("unused");
  }

  _deselect(ev) {
    ev.target.selected = null;
  }

  _handleHelp() {
    window.open("https://www.home-assistant.io/lovelace/", "_blank");
  }

  _editModeEnable() {
    this.lovelace.setEditMode(true);
    if (this.config.views.length < 2) {
      this.$.view.classList.remove("tabs-hidden");
      this.fire("iron-resize");
    }
  }

  _editModeDisable() {
    this.lovelace.setEditMode(false);
    if (this.config.views.length < 2) {
      this.$.view.classList.add("tabs-hidden");
      this.fire("iron-resize");
    }
  }

  _editModeChanged() {
    this._selectView(this._curView);
  }

  _editView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace,
      viewIndex: this._curView,
    });
  }

  _addView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace,
    });
  }

  _handleViewSelected(ev) {
    const index = ev.detail.selected;
    this._navigateView(index);
  }

  _navigateView(viewIndex) {
    if (viewIndex !== this._curView) {
      const path = this.config.views[viewIndex].path || viewIndex;
      this.navigate(`/lovelace/${path}`);
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
    let background = this.config.background || "";

    if (viewIndex === "unused") {
      view = document.createElement("hui-unused-entities");
      view.setConfig(this.config);
    } else {
      const viewConfig = this.config.views[this._curView];
      if (!viewConfig) {
        this._editModeEnable();
        return;
      }
      if (viewConfig.panel) {
        view = createCardElement(viewConfig.cards[0]);
        view.isPanel = true;
      } else {
        view = document.createElement("hui-view");
        view.lovelace = this.lovelace;
        view.config = viewConfig;
        view.columns = this.columns;
        view.index = viewIndex;
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
    this.$.view.classList.toggle("tabs-hidden", config.views.length < 2);
  }

  _columnsChanged(columns) {
    if (!this.$.view.lastChild) return;
    this.$.view.lastChild.columns = columns;
  }

  _loadResources(resources) {
    resources.forEach((resource) => {
      switch (resource.type) {
        case "css":
          if (resource.url in CSS_CACHE) break;
          CSS_CACHE[resource.url] = loadCSS(resource.url);
          break;

        case "js":
          if (resource.url in JS_CACHE) break;
          JS_CACHE[resource.url] = loadJS(resource.url);
          break;

        case "module":
          loadModule(resource.url);
          break;

        case "html":
          import(/* webpackChunkName: "import-href-polyfill" */ "../../resources/html-import/import-href").then(
            ({ importHref }) => importHref(resource.url)
          );
          break;

        default:
          // eslint-disable-next-line
          console.warn("Unknown resource type specified: ${resource.type}");
      }
    });
  }

  _computeConfig(lovelace) {
    return lovelace ? lovelace.config : null;
  }

  _computeEditMode(lovelace) {
    return lovelace ? lovelace.editMode : false;
  }
}
customElements.define("hui-root", HUIRoot);
