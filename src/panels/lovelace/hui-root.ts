import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-scroll-effects/effects/waterfall";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/app-route/app-route";
import "@polymer/paper-icon-button/paper-icon-button";
import "@material/mwc-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { HassEntities } from "home-assistant-js-websocket";

import scrollToTarget from "../../common/dom/scroll-to-target";

import "../../layouts/ha-app-layout";
import "../../components/ha-start-voice-button";
import "../../components/ha-icon";
import { loadModule, loadCSS, loadJS } from "../../common/dom/load_resource";
import { subscribeNotifications } from "../../data/ws-notifications";
import debounce from "../../common/util/debounce";
import { HomeAssistant } from "../../types";
import { LovelaceConfig } from "../../data/lovelace";
import { navigate } from "../../common/navigate";
import { fireEvent } from "../../common/dom/fire_event";
import { computeNotifications } from "./common/compute-notifications";
import { swapView } from "./editor/config-util";

import "./components/notifications/hui-notification-drawer";
import "./components/notifications/hui-notifications-button";
import "./hui-view";
// Not a duplicate import, this one is for type
// tslint:disable-next-line
import { HUIView } from "./hui-view";
import { createCardElement } from "./common/create-card-element";
import { showEditViewDialog } from "./editor/view-editor/show-edit-view-dialog";
import { showEditLovelaceDialog } from "./editor/lovelace-editor/show-edit-lovelace-dialog";
import { Lovelace } from "./types";
import { afterNextRender } from "../../common/util/render-status";
import { haStyle } from "../../resources/ha-style";
import { computeRTL, computeRTLDirection } from "../../common/util/compute_rtl";

// CSS and JS should only be imported once. Modules and HTML are safe.
const CSS_CACHE = {};
const JS_CACHE = {};

let loadedUnusedEntities = false;

class HUIRoot extends LitElement {
  public narrow?: boolean;
  public showMenu?: boolean;
  public hass?: HomeAssistant;
  public lovelace?: Lovelace;
  public columns?: number;
  public route?: { path: string; prefix: string };
  private _routeData?: { view: string };
  private _curView?: number | "hass-unused-entities";
  private _notificationsOpen: boolean;
  private _persistentNotifications?: Notification[];
  private _viewCache?: { [viewId: string]: HUIView };

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
      _routeData: {},
      _curView: {},
      _notificationsOpen: {},
      _persistentNotifications: {},
    };
  }

  constructor() {
    super();
    this._notificationsOpen = false;
    // The view can trigger a re-render when it knows that certain
    // web components have been loaded.
    this._debouncedConfigChanged = debounce(
      () => this._selectView(this._curView, true),
      100,
      false
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

  protected render(): TemplateResult | void {
    return html`
    <app-route .route="${this.route}" pattern="/:view" data="${
      this._routeData
    }" @data-changed="${this._routeDataChanged}"></app-route>
    <hui-notification-drawer
      .hass="${this.hass}"
      .notifications="${this._notifications}"
      .open="${this._notificationsOpen}"
      @open-changed="${this._handleNotificationsOpenChanged}"
      .narrow="${this.narrow}"
    ></hui-notification-drawer>
    <ha-app-layout id="layout">
      <app-header slot="header" effects="waterfall" class="${classMap({
        "edit-mode": this._editMode,
      })}" fixed condenses>
        ${
          this._editMode
            ? html`
                <app-toolbar class="edit-mode">
                  <paper-icon-button
                    icon="hass:close"
                    @click="${this._editModeDisable}"
                  ></paper-icon-button>
                  <div main-title>
                    ${this.config.title ||
                      this.hass!.localize("ui.panel.lovelace.editor.header")}
                    <paper-icon-button
                      icon="hass:pencil"
                      class="edit-icon"
                      @click="${this._editLovelace}"
                    ></paper-icon-button>
                  </div>
                  <paper-icon-button
                    icon="hass:help-circle"
                    title="Help"
                    @click="${this._handleHelp}"
                  ></paper-icon-button>
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
                      <paper-item @click="${this.lovelace!.enableFullEditMode}"
                        >${this.hass!.localize(
                          "ui.panel.lovelace.editor.menu.raw_editor"
                        )}</paper-item
                      >
                    </paper-listbox>
                  </paper-menu-button>
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
                    .open="${this._notificationsOpen}"
                    @open-changed="${this._handleNotificationsOpenChanged}"
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
                      ${this._yamlMode
                        ? html`
                            <paper-item @click="${this._handleRefresh}"
                              >${this.hass!.localize(
                                "ui.panel.lovelace.menu.refresh"
                              )}</paper-item
                            >
                          `
                        : ""}
                      <paper-item @click="${this._handleUnusedEntities}"
                        >${this.hass!.localize(
                          "ui.panel.lovelace.menu.unused_entities"
                        )}</paper-item
                      >
                      <paper-item @click="${this._editModeEnable}"
                        >${this.hass!.localize(
                          "ui.panel.lovelace.menu.configure_ui"
                        )}</paper-item
                      >
                      <paper-item @click="${this._handleHelp}"
                        >${this.hass!.localize(
                          "ui.panel.lovelace.menu.help"
                        )}</paper-item
                      >
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
                    dir="${computeRTLDirection(this.hass!)}"
                  >
                    ${this.lovelace!.config.views.map(
                      (view) => html`
                        <paper-tab>
                          ${this._editMode
                            ? html`
                                <paper-icon-button
                                  title="Move view left"
                                  class="edit-icon view"
                                  icon="${computeRTL(this.hass!)
                                    ? "hass:arrow-right"
                                    : "hass:arrow-left"}"
                                  @click="${this._moveViewLeft}"
                                  ?disabled="${this._curView === 0}"
                                ></paper-icon-button>
                              `
                            : ""}
                          ${view.icon
                            ? html`
                                <ha-icon
                                  title="${view.title}"
                                  .icon="${view.icon}"
                                ></ha-icon>
                              `
                            : view.title || "Unnamed view"}
                          ${this._editMode
                            ? html`
                                <ha-icon
                                  title="Edit view"
                                  class="edit-icon view"
                                  icon="hass:pencil"
                                  @click="${this._editView}"
                                ></ha-icon>
                                <paper-icon-button
                                  title="Move view right"
                                  class="edit-icon view"
                                  icon="${computeRTL(this.hass!)
                                    ? "hass:arrow-left"
                                    : "hass:arrow-right"}"
                                  @click="${this._moveViewRight}"
                                  ?disabled="${(this._curView! as number) +
                                    1 ===
                                    this.lovelace!.config.views.length}"
                                ></paper-icon-button>
                              `
                            : ""}
                        </paper-tab>
                      `
                    )}
                    ${this._editMode
                      ? html`
                          <paper-icon-button
                            id="add-view"
                            @click="${this._addView}"
                            title="${this.hass!.localize(
                              "ui.panel.lovelace.editor.edit_view.add"
                            )}"
                            icon="hass:plus"
                          ></paper-icon-button>
                        `
                      : ""}
                  </paper-tabs>
                </div>
              `
            : ""
        }
      </app-header>
      <div id='view' class="${classMap({
        "tabs-hidden": this.lovelace!.config.views.length < 2,
      })}" @ll-rebuild='${this._debouncedConfigChanged}'></div>
    </app-header-layout>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          --dark-color: #455a64;
          --text-dark-color: #fff;
        }

        ha-app-layout {
          min-height: 100%;
        }
        paper-tabs {
          margin-left: 12px;
          --paper-tabs-selection-bar-color: var(--text-primary-color, #fff);
          text-transform: uppercase;
        }
        .edit-mode {
          background-color: var(--dark-color, #455a64);
          color: var(--text-dark-color);
        }
        .edit-mode div[main-title] {
          pointer-events: auto;
        }
        paper-tab.iron-selected .edit-icon {
          display: inline-flex;
        }
        .edit-icon {
          color: var(--accent-color);
          padding-left: 8px;
        }
        .edit-icon[disabled] {
          color: var(--disabled-text-color);
        }
        .edit-icon.view {
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
        mwc-button.warning:not([disabled]) {
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
      `,
    ];
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const view = this._viewRoot;
    const huiView = view.lastChild as HUIView;

    if (changedProperties.has("columns") && huiView) {
      huiView.columns = this.columns;
    }

    if (changedProperties.has("hass") && huiView) {
      huiView.hass = this.hass;
    }

    let newSelectView;
    let force = false;

    if (changedProperties.has("route")) {
      const views = this.config && this.config.views;
      if (
        this.route!.path === "" &&
        this.route!.prefix === "/lovelace" &&
        views
      ) {
        navigate(this, `/lovelace/${views[0].path || 0}`, true);
      } else if (this._routeData!.view === "hass-unused-entities") {
        newSelectView = "hass-unused-entities";
      } else if (this._routeData!.view) {
        const selectedView = this._routeData!.view;
        const selectedViewInt = parseInt(selectedView, 10);
        let index = 0;
        for (let i = 0; i < views.length; i++) {
          if (views[i].path === selectedView || i === selectedViewInt) {
            index = i;
            break;
          }
        }
        newSelectView = index;
      }
    }

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as
        | Lovelace
        | undefined;

      if (!oldLovelace || oldLovelace.config !== this.lovelace!.config) {
        this._loadResources(this.lovelace!.config.resources || []);
        // On config change, recreate the current view from scratch.
        force = true;
        // Recalculate to see if we need to adjust content area for tab bar
        fireEvent(this, "iron-resize");
      }

      if (!oldLovelace || oldLovelace.editMode !== this.lovelace!.editMode) {
        // On edit mode change, recreate the current view from scratch
        force = true;
        // Recalculate to see if we need to adjust content area for tab bar
        fireEvent(this, "iron-resize");
      }
    }

    if (newSelectView !== undefined || force) {
      if (force && newSelectView === undefined) {
        newSelectView = this._curView;
      }
      this._selectView(newSelectView, force);
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

  private get _yamlMode(): boolean {
    return this.lovelace!.mode === "yaml";
  }

  private get _editMode() {
    return this.lovelace!.editMode;
  }

  private get _layout(): any {
    return this.shadowRoot!.getElementById("layout");
  }

  private get _viewRoot(): HTMLDivElement {
    return this.shadowRoot!.getElementById("view") as HTMLDivElement;
  }

  private _routeDataChanged(ev): void {
    this._routeData = ev.detail.value;
  }

  private _handleNotificationsOpenChanged(ev): void {
    this._notificationsOpen = ev.detail.value;
  }

  private _updateNotifications(
    states: HassEntities,
    persistent: Array<unknown>
  ): Array<unknown> {
    const configurator = computeNotifications(states);
    return persistent.concat(configurator);
  }

  private _handleRefresh(): void {
    fireEvent(this, "config-refresh");
  }

  private _handleUnusedEntities(): void {
    navigate(this, `/lovelace/hass-unused-entities`);
  }

  private _deselect(ev): void {
    ev.target.selected = null;
  }

  private _handleHelp(): void {
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

  private _editModeDisable(): void {
    this.lovelace!.setEditMode(false);
    if (this.config.views.length < 2) {
      fireEvent(this, "iron-resize");
    }
  }

  private _editLovelace() {
    showEditLovelaceDialog(this, this.lovelace!);
  }

  private _editView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      viewIndex: this._curView as number,
    });
  }

  private _moveViewLeft() {
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) - 1;
    this._curView = newIndex;
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _moveViewRight() {
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) + 1;
    this._curView = newIndex;
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _addView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
    });
  }

  private _handleViewSelected(ev) {
    const viewIndex = ev.detail.selected as number;

    if (viewIndex !== this._curView) {
      const path = this.config.views[viewIndex].path || viewIndex;
      navigate(this, `/lovelace/${path}`);
    }
    scrollToTarget(this, this._layout.header.scrollTarget);
  }

  private async _selectView(
    viewIndex: HUIRoot["_curView"],
    force: boolean
  ): Promise<void> {
    if (!force && this._curView === viewIndex) {
      return;
    }

    viewIndex = viewIndex === undefined ? 0 : viewIndex;

    this._curView = viewIndex;

    if (force) {
      this._viewCache = {};
    }

    // Recreate a new element to clear the applied themes.
    const root = this._viewRoot;

    if (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (viewIndex === "hass-unused-entities") {
      if (!loadedUnusedEntities) {
        loadedUnusedEntities = true;
        await import(/* webpackChunkName: "hui-unused-entities" */ "./hui-unused-entities");
      }
      const unusedEntities = document.createElement("hui-unused-entities");
      unusedEntities.setConfig(this.config);
      unusedEntities.hass = this.hass!;
      root.style.background = this.config.background || "";
      root.appendChild(unusedEntities);
      return;
    }

    let view;
    const viewConfig = this.config.views[viewIndex];

    if (!viewConfig) {
      this._editModeEnable();
      return;
    }

    if (!force && this._viewCache![viewIndex]) {
      view = this._viewCache![viewIndex];
    } else {
      await new Promise((resolve) => afterNextRender(resolve));

      if (viewConfig.panel && viewConfig.cards && viewConfig.cards.length > 0) {
        view = createCardElement(viewConfig.cards[0]);
        view.isPanel = true;
      } else {
        view = document.createElement("hui-view");
        view.lovelace = this.lovelace;
        view.columns = this.columns;
        view.index = viewIndex;
      }
      this._viewCache![viewIndex] = view;
    }

    view.hass = this.hass;
    root.style.background =
      viewConfig.background || this.config.background || "";
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
