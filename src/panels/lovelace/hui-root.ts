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

import scrollToTarget from "../../common/dom/scroll-to-target";

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
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";
import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { HomeAssistant } from "../../types";
import { Lovelace } from "./types";
import { LovelaceConfig } from "../../data/lovelace";
import { HassEntities } from "home-assistant-js-websocket";
import { navigate } from "../../common/navigate";
import { fireEvent } from "../../common/dom/fire_event";
import { classMap } from "lit-html/directives/classMap";

// CSS and JS should only be imported once. Modules and HTML are safe.
const CSS_CACHE = {};
const JS_CACHE = {};

class HUIRoot extends hassLocalizeLitMixin(LitElement) {
  public narrow?: boolean;
  public showMenu?: boolean;
  public hass?: HomeAssistant;
  public lovelace?: Lovelace;
  public columns?: number;
  public route?: { path: string; prefix: string };
  public routeData?: { view: string };
  private _curView: number;
  private notificationsOpen?: boolean;
  private _persistentNotifications?: Notification[];
  private _haStyle?: DocumentFragment;

  private _debouncedConfigChanged: () => void;
  private _unsubNotifications?: () => void;

  static get properties(): PropertyDeclarations {
    return {
      narrow: {},
      showMenu: {},
      hass: {},
      lovelace: {},
      columns: {},
      route: {},
      routeData: {},
      _curView: {},
      notificationsOpen: {},
      _persistentNotifications: {},
    };
  }

  constructor() {
    super();
    this._curView = 0;
    this._debouncedConfigChanged = debounce(
      () => this._selectView(this._curView),
      100
    );
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._unsubNotifications = subscribeNotifications(
      this.hass!.connection,
      (notifications) => {
        this._persistentNotifications = notifications;
      }
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsubNotifications) {
      this._unsubNotifications();
    }
  }

  protected render() : TemplateResult {
    return html`
    ${this.renderStyle()}
    <app-route .route="${this.route}" pattern="/:view" data="${
      this.routeData
    }" @data-changed="${this._routeDataChanged}"></app-route>
    <hui-notification-drawer
      .hass="${this.hass}"
      .notifications="${this._notifications}"
      .open="${this.notificationsOpen}"
      @open-changed="${this._handleNotificationsOpenChanged}"
      .narrow="${this.narrow}"
    ></hui-notification-drawer>
    <ha-app-layout id="layout">
      <app-header slot="header" effects="waterfall" fixed condenses>
        ${
          this._editMode
            ? html`
                <app-toolbar>
                  <paper-icon-button
                    icon="hass:close"
                    @click="${this._editModeDisable}"
                  ></paper-icon-button>
                  <div main-title>
                    ${this.localize("ui.panel.lovelace.editor.header")}
                  </div>
                </app-toolbar>
              `
            : html`
                <app-toolbar>
                  <ha-menu-button
                    .narrow="${this.narrow}"
                    .showMenu="${this.showMenu}"
                  ></ha-menu-button>
                  <div main-title>${this.config.title || "Home Assistant"}</div>
                  <hui-notifications-button
                    .hass="${this.hass}"
                    .notificationsOpen="{{notificationsOpen}}"
                    .notifications="${this._notifications}"
                  ></hui-notifications-button>
                  <ha-start-voice-button
                    .hass="${this.hass}"
                  ></ha-start-voice-button>
                  <paper-menu-button
                    no-animations
                    horizontal-align="right"
                    horizontal-offset="-5"
                  >
                    <paper-icon-button
                      icon="hass:dots-vertical"
                      slot="dropdown-trigger"
                    ></paper-icon-button>
                    <paper-listbox
                      @iron-select="${this._deselect}"
                      slot="dropdown-content"
                    >
                      ${
                        this._yamlMode
                          ? html`
                              <paper-item @click="${this._handleRefresh}"
                                >Refresh</paper-item
                              >
                            `
                          : ""
                      }
                      <paper-item @click="${this._handleUnusedEntities}"
                        >Unused entities</paper-item
                      >
                      <paper-item @click="${this._editModeEnable}"
                        >${
                          this.localize("ui.panel.lovelace.editor.configure_ui")
                        }</paper-item
                      >
                      ${
                        this._storageMode
                          ? html`
                              <paper-item
                                @click="${this.lovelace!.enableFullEditMode}"
                                >Raw config editor</paper-item
                              >
                            `
                          : ""
                      }
                      <paper-item @click="${this._handleHelp}">Help</paper-item>
                    </paper-listbox>
                  </paper-menu-button>
                </app-toolbar>
              `
        }

        ${
          this.lovelace!.config.views.length > 1 || this._editMode
            ? html`
                <div sticky>
                  <paper-tabs
                    scrollable
                    .selected="${this._curView}"
                    @iron-activate="${this._handleViewSelected}"
                  >
                    ${
                      this.lovelace!.config.views.map(
                        (view) => html`
                          <paper-tab>
                            ${
                              view.icon
                                ? html`
                                    <ha-icon
                                      title="${view.title}"
                                      .icon="${view.icon}"
                                    ></ha-icon>
                                  `
                                : view.title || "Unnamed view"
                            }
                            ${
                              this._editMode
                                ? html`
                                    <ha-icon
                                      class="edit-view-icon"
                                      @click="${this._editView}"
                                      icon="hass:pencil"
                                    ></ha-icon>
                                  `
                                : ""
                            }
                          </paper-tab>
                        `
                      )
                    }
                    ${
                      this._editMode
                        ? html`
                            <paper-button
                              id="add-view"
                              @click="${this._addView}"
                            >
                              <ha-icon
                                title="${
                                  this.localize(
                                    "ui.panel.lovelace.editor.edit_view.add"
                                  )
                                }"
                                icon="hass:plus"
                              ></ha-icon>
                            </paper-button>
                          `
                        : ""
                    }
                  </paper-tabs>
                </div>
              `
            : ""
        }
      </app-header>
      <div id='view' class="${classMap({
        "tabs-hidden": this.lovelace!.config.views.length < 2,
      })}" @rebuild-view='${this._debouncedConfigChanged}'></div>
    </app-header-layout>
    `;
  }

  protected renderStyle() {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }

    return html`
      ${this._haStyle}
      <style include="ha-style">
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
          --paper-tabs-selection-bar-color: var(--text-primary-color, #fff);
          text-transform: uppercase;
        }
        paper-tab.iron-selected .edit-view-icon {
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
    `;
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    const view = this._view;
    const huiView = view.lastChild as any;

    if (changedProperties.has("columns") && huiView) {
      (this._view.lastChild as any).columns = this.columns;
    }

    if (changedProperties.has("hass") && huiView) {
      huiView.hass = this.hass;
    }

    if (changedProperties.has("route")) {
      const views = this.config && this.config.views;
      if (
        this.route!.path === "" &&
        this.route!.prefix === "/lovelace" &&
        views
      ) {
        navigate(this, `/lovelace/${views[0].path || 0}`, true);
      } else if (this.routeData!.view) {
        const selectedView = this.routeData!.view;
        const selectedViewInt = parseInt(selectedView, 10);
        let index = 0;
        for (let i = 0; i < views.length; i++) {
          if (views[i].path === selectedView || i === selectedViewInt) {
            index = i;
            break;
          }
        }
        if (index !== this._curView) {
          this._selectView(index);
        }
      }
    }

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as
        | Lovelace
        | undefined;

      if (!oldLovelace || oldLovelace.config !== this.lovelace!.config) {
        this._loadResources(this.lovelace!.config.resources || []);
        // On config change, recreate the view from scratch.
        this._selectView(this._curView);
      }

      if (!oldLovelace || oldLovelace.editMode !== this.lovelace!.editMode) {
        this._editModeChanged();
      }
    }
  }

  private get _notifications() {
    return this._updateNotifications(
      this.hass!.states,
      this._persistentNotifications! || []
    );
  }

  private get config(): LovelaceConfig {
    return this.lovelace!.config;
  }

  private get _yamlMode() {
    return this.lovelace!.mode === "yaml";
  }

  private get _storageMode() {
    return this.lovelace!.mode === "storage";
  }

  private get _editMode() {
    return this.lovelace!.editMode;
  }

  private get _layout(): any {
    return this.shadowRoot!.getElementById("layout");
  }

  private get _view(): HTMLDivElement {
    return this.shadowRoot!.getElementById("view") as HTMLDivElement;
  }

  private _routeDataChanged(ev): void {
    this.routeData = ev.detail.value;
  }

  private _handleNotificationsOpenChanged(ev) {
    this.notificationsOpen = ev.detail.value;
  }

  private _updateNotifications(
    states: HassEntities,
    persistent: Array<unknown>
  ) {
    const configurator = computeNotifications(states);
    return persistent.concat(configurator);
  }

  private _handleRefresh() {
    fireEvent(this, "config-refresh");
  }

  private _handleUnusedEntities() {
    this._selectView("unused");
  }

  private _deselect(ev): void {
    ev.target.selected = null;
  }

  private _handleHelp() {
    window.open("https://www.home-assistant.io/lovelace/", "_blank");
  }

  private _editModeEnable(): void {
    if (this._yamlMode) {
      window.alert("The edit UI is not available when in YAML mode.");
      return;
    }
    this.lovelace!.setEditMode(true);
    if (this.config.views.length < 2) {
      fireEvent(this, "iron-resize");
    }
  }

  private _editModeDisable() {
    this.lovelace!.setEditMode(false);
    if (this.config.views.length < 2) {
      fireEvent(this, "iron-resize");
    }
  }

  private _editModeChanged(): void {
    this._selectView(this._curView);
  }

  private _editView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      viewIndex: this._curView,
    });
  }

  private _addView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
    });
  }

  private _handleViewSelected(ev) {
    const index = ev.detail.selected;
    this._navigateView(index);
  }

  private _navigateView(viewIndex) {
    if (viewIndex !== this._curView) {
      const path = this.config.views[viewIndex].path || viewIndex;
      navigate(this, `/lovelace/${path}`);
    }
    scrollToTarget(this, this._layout.header.scrollTarget);
  }

  private _selectView(viewIndex) {
    this._curView = viewIndex;

    // Recreate a new element to clear the applied themes.
    const root = this._view;
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
      if (viewConfig.panel && viewConfig.cards && viewConfig.cards.length > 0) {
        view = createCardElement(viewConfig.cards[0]);
        view.isPanel = true;
      } else {
        view = document.createElement("hui-view");
        view.lovelace = this.lovelace;
        view.config = viewConfig;
        view.columns = this.columns;
        view.index = viewIndex;
      }
      if (viewConfig.background) {
        background = viewConfig.background;
      }
    }

    this._view.style.background = background;

    view.hass = this.hass;
    root.appendChild(view);
  }

  private _loadResources(resources) {
    resources.forEach((resource) => {
      switch (resource.type) {
        case "css":
          if (resource.url in CSS_CACHE) {
            break;
          }
          CSS_CACHE[resource.url] = loadCSS(resource.url);
          break;

        case "js":
          if (resource.url in JS_CACHE) {
            break;
          }
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
          // tslint:disable-next-line
          console.warn(`Unknown resource type specified: ${resource.type}`);
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-root": HUIRoot;
  }
}

customElements.define("hui-root", HUIRoot);
