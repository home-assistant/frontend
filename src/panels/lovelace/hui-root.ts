import "@material/mwc-button";

import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  addSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { debounce } from "../../common/util/debounce";
import { afterNextRender } from "../../common/util/render-status";
import "../../components/ha-button-menu";
import "../../components/ha-icon";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-arrow-next";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-svg-icon";
import "../../components/sl-tab-group";
import type { LovelacePanelConfig } from "../../data/lovelace";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../data/lovelace/config/view";
import { showMoreInfoDialog } from "../../dialogs/more-info/show-ha-more-info-dialog";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, PanelInfo } from "../../types";
import { showEditViewDialog } from "./editor/view-editor/show-edit-view-dialog";
import type { Lovelace } from "./types";
import "./views/hui-view";
import type { HUIView } from "./views/hui-view";
import "./views/hui-view-background";
import "./views/hui-view-container";
import "./navigation/hui-lovelace-navigation";
import "./hui-header";

@customElement("hui-root")
class HUIRoot extends LitElement {
  @property({ attribute: false }) public panel?: PanelInfo<LovelacePanelConfig>;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route?: {
    path: string;
    prefix: string;
  };

  @state() private _curView?: number | "hass-unused-entities";

  private _viewCache?: Record<string, HUIView>;

  private _viewScrollPositions: Record<string, number> = {};

  private _restoreScroll = false;

  private _debouncedConfigChanged: () => void;

  constructor() {
    super();
    // The view can trigger a re-render when it knows that certain
    // web components have been loaded.
    this._debouncedConfigChanged = debounce(
      () => this._selectView(this._curView, true),
      100,
      false
    );
  }

  protected render(): TemplateResult {
    const views = this.lovelace?.config.views ?? [];
    const curViewConfig =
      typeof this._curView === "number" ? views[this._curView] : undefined;
    const background = curViewConfig?.background || this.config.background;

    return html`
      <div
        class=${classMap({
          "edit-mode": this._editMode,
        })}
      >
        <hui-header
          .panel=${this.panel}
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .narrow=${this.narrow}
          .route=${this.route}
          .curView=${this._curView}
          @config-refresh=${this._handleConfigRefresh}
          @edit-view=${this._handleEditView}
          @add-view=${this._handleAddView}
          @navigate-to-view=${this._handleNavigateToView}
        ></hui-header>
        <hui-view-container
          .hass=${this.hass}
          .theme=${curViewConfig?.theme}
          id="view"
          @ll-rebuild=${this._debouncedConfigChanged}
        >
          <hui-view-background .hass=${this.hass} .background=${background}>
          </hui-view-background>
        </hui-view-container>
        ${this.narrow && !this._editMode
          ? html`
              <hui-lovelace-navigation
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                .navigationConfig=${{
                  mode: "mobile",
                  editMode: this._editMode,
                  narrow: this.narrow,
                  curView: this._curView,
                  route: this.route,
                }}
              ></hui-lovelace-navigation>
            `
          : nothing}
      </div>
    `;
  }

  private _handleWindowScroll = () => {
    this.toggleAttribute("scrolled", window.scrollY !== 0);
  };

  private _handlePopState = () => {
    this._restoreScroll = true;
  };

  private _isVisible = (view: LovelaceViewConfig) =>
    Boolean(
      this._editMode ||
        view.visible === undefined ||
        view.visible === true ||
        (Array.isArray(view.visible) &&
          view.visible.some((show) => show.user === this.hass!.user?.id))
    );

  private _clearParam(param: string) {
    window.history.replaceState(
      null,
      "",
      constructUrlCurrentPath(removeSearchParam(param))
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    // Check for requested edit mode
    const searchParams = extractSearchParamsObject();
    if (searchParams.edit === "1") {
      this._clearParam("edit");
      if (this.hass!.user?.is_admin && this.lovelace!.mode === "storage") {
        this.lovelace!.setEditMode(true);
      }
    } else if (searchParams.conversation === "1") {
      this._clearParam("conversation");
      this._showVoiceCommandDialog();
    } else if (searchParams["more-info-entity-id"]) {
      const entityId = searchParams["more-info-entity-id"];
      this._clearParam("more-info-entity-id");
      // Wait for the next render to ensure the view is fully loaded
      // because the more info dialog is closed when the url changes
      afterNextRender(() => {
        this._showMoreInfoDialog(entityId);
      });
    }

    window.addEventListener("scroll", this._handleWindowScroll, {
      passive: true,
    });
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("scroll", this._handleWindowScroll, {
      passive: true,
    });
    window.addEventListener("popstate", this._handlePopState);
    // Disable history scroll restoration because it is managed manually here
    window.history.scrollRestoration = "manual";
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("scroll", this._handleWindowScroll);
    window.removeEventListener("popstate", this._handlePopState);
    this.toggleAttribute("scrolled", window.scrollY !== 0);
    // Re-enable history scroll restoration when leaving the page
    window.history.scrollRestoration = "auto";
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const view = this._viewRoot;
    const huiView = view.lastChild as HUIView;

    if (changedProperties.has("hass") && huiView) {
      huiView.hass = this.hass;
    }

    if (changedProperties.has("narrow") && huiView) {
      huiView.narrow = this.narrow;
    }

    let newSelectView;
    let force = false;

    let viewPath: string | undefined = this.route!.path.split("/")[1];
    viewPath = viewPath ? decodeURI(viewPath) : undefined;

    if (changedProperties.has("route")) {
      const views = this.config.views;

      if (!viewPath && views.length) {
        newSelectView = views.findIndex(this._isVisible);
        this._navigateToView(views[newSelectView].path || newSelectView, true);
      } else if (viewPath === "hass-unused-entities") {
        newSelectView = "hass-unused-entities";
      } else if (viewPath) {
        const selectedView = viewPath;
        const selectedViewInt = Number(selectedView);
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
        // On config change, recreate the current view from scratch.
        force = true;
      }

      if (!oldLovelace || oldLovelace.editMode !== this.lovelace!.editMode) {
        const views = this.config && this.config.views;

        // Leave unused entities when leaving edit mode
        if (
          this.lovelace!.mode === "storage" &&
          viewPath === "hass-unused-entities"
        ) {
          newSelectView = views.findIndex(this._isVisible);
          this._navigateToView(
            views[newSelectView].path || newSelectView,
            true
          );
        }
      }

      if (!force && huiView) {
        huiView.lovelace = this.lovelace!;
      }
    }

    if (newSelectView !== undefined || force) {
      if (force && newSelectView === undefined) {
        newSelectView = this._curView;
      }
      // Will allow for ripples to start rendering
      afterNextRender(() => {
        if (changedProperties.has("route")) {
          const position =
            (this._restoreScroll && this._viewScrollPositions[newSelectView]) ||
            0;
          this._restoreScroll = false;
          requestAnimationFrame(() =>
            scrollTo({ behavior: "auto", top: position })
          );
        }
        this._selectView(newSelectView, force);
      });
    }
  }

  private get config(): LovelaceConfig {
    return this.lovelace!.config;
  }

  private get _editMode() {
    return this.lovelace!.editMode;
  }

  private get _viewRoot(): HTMLDivElement {
    return this.shadowRoot!.getElementById("view") as HTMLDivElement;
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this, this.hass, { pipeline_id: "last_used" });
  }

  private _showMoreInfoDialog(entityId: string): void {
    showMoreInfoDialog(this, { entityId });
  }

  private _navigateToView(path: string | number, replace?: boolean) {
    const url = this.lovelace!.editMode
      ? `${this.route!.prefix}/${path}?${addSearchParam({ edit: "1" })}`
      : `${this.route!.prefix}/${path}${location.search}`;

    const currentUrl = `${location.pathname}${location.search}`;
    if (currentUrl !== url) {
      navigate(url, { replace });
    }
  }

  private _handleConfigRefresh(): void {
    fireEvent(this, "config-refresh");
  }

  private _handleEditView(ev: CustomEvent): void {
    const viewIndex = ev.detail.viewIndex;
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      viewIndex: viewIndex,
      saveCallback: (index: number, viewConfig: LovelaceViewConfig) => {
        const path = viewConfig.path || index;
        this._navigateToView(path);
      },
    });
  }

  private _handleAddView(): void {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      saveCallback: (viewIndex: number, viewConfig: LovelaceViewConfig) => {
        const path = viewConfig.path || viewIndex;
        this._navigateToView(path);
      },
    });
  }

  private _handleNavigateToView(ev: CustomEvent): void {
    const { path, replace } = ev.detail;
    this._navigateToView(path, replace);
  }

  private _selectView(viewIndex: HUIRoot["_curView"], force: boolean): void {
    if (!force && this._curView === viewIndex) {
      return;
    }

    // Save scroll position of current view
    if (this._curView != null) {
      this._viewScrollPositions[this._curView] = window.scrollY;
    }

    viewIndex = viewIndex === undefined ? 0 : viewIndex;

    this._curView = viewIndex;

    if (force) {
      this._viewCache = {};
      this._viewScrollPositions = {};
    }

    // Recreate a new element to clear the applied themes.
    const root = this._viewRoot;

    if (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (viewIndex === "hass-unused-entities") {
      const unusedEntities = document.createElement("hui-unused-entities");
      // Wait for promise to resolve so that the element has been upgraded.
      import("./editor/unused-entities/hui-unused-entities").then(() => {
        unusedEntities.hass = this.hass!;
        unusedEntities.lovelace = this.lovelace!;
        unusedEntities.narrow = this.narrow;
      });
      root.appendChild(unusedEntities);
      return;
    }

    let view;
    const viewConfig = this.config.views[viewIndex];

    if (!viewConfig) {
      this.lovelace!.setEditMode(true);
      return;
    }

    if (!force && this._viewCache![viewIndex]) {
      view = this._viewCache![viewIndex];
    } else {
      view = document.createElement("hui-view");
      view.index = viewIndex;
      this._viewCache![viewIndex] = view;
    }

    view.lovelace = this.lovelace;
    view.hass = this.hass;
    view.narrow = this.narrow;

    root.appendChild(view);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .header {
          background-color: var(--primary-background-color);
          color: var(--primary-text-color);
          border-bottom: var(--app-header-border-bottom, none);
          position: fixed;
          top: 0;
          width: var(--mdc-top-app-bar-width, 100%);
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
          padding-top: var(--safe-area-inset-top);
          z-index: 4;
          transition: box-shadow 200ms linear;
        }
        @media (min-width: 600px) {
          .header {
            background-color: var(--app-header-background-color);
            color: var(--app-header-text-color, white);
          }
        }
        :host([scrolled]) .header {
          box-shadow: var(
            --mdc-top-app-bar-fixed-box-shadow,
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12)
          );
        }
        .edit-mode .header {
          background-color: var(--app-header-edit-background-color, #455a64);
          color: var(--app-header-edit-text-color, white);
        }
        .toolbar {
          height: var(--header-height);
          display: flex;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 0px 12px;
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 0 4px;
          }
        }
        .main-area {
          margin: var(--margin-title);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .main-title {
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }
        .action-items {
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        .edit-mode div[main-area] {
          pointer-events: auto;
        }
        .edit-tab-bar {
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }
        @media (max-width: 599px) {
          .edit-tab-bar {
            padding: 0 4px;
          }
        }
        .edit-icon {
          color: var(--accent-color);
          padding: 0 8px;
          vertical-align: middle;
          --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
          direction: var(--direction);
        }
        .edit-icon:last-child {
          padding-left: 0;
        }
        #add-view {
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        #add-view ha-svg-icon {
          background-color: var(--accent-color);
          border-radius: 4px;
        }
        a {
          color: var(--text-primary-color, white);
        }
        mwc-button.warning:not([disabled]) {
          color: var(--error-color);
        }
        hui-view-container {
          position: relative;
          display: flex;
          min-height: 100vh;
          box-sizing: border-box;
          padding-top: calc(var(--header-height) + var(--safe-area-inset-top));
          padding-left: var(--safe-area-inset-left);
          padding-right: var(--safe-area-inset-right);
          padding-inline-start: var(--safe-area-inset-left);
          padding-inline-end: var(--safe-area-inset-right);
          padding-bottom: var(--safe-area-inset-bottom);
        }
        @media (min-width: 600px) {
          hui-view-container {
            padding-bottom: calc(60px + var(--safe-area-inset-bottom));
          }
        }
        .edit-mode hui-view-container {
          padding-bottom: var(--safe-area-inset-bottom);
        }
        hui-view-container > * {
          flex: 1 1 100%;
          max-width: 100%;
        }
        /**
         * When we have tabs in the second row (only edit mode)
         */
        .edit-mode hui-view-container {
          padding-top: calc(
            var(--header-height) + 48px + var(--safe-area-inset-top)
          );
        }
        .menu-link {
          text-decoration: none;
        }
        .exit-edit-mode {
          --mdc-theme-primary: var(--app-header-edit-text-color, #fff);
          --mdc-button-outline-color: var(--app-header-edit-text-color, #fff);
          --mdc-typography-button-font-size: var(--ha-font-size-m);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-root": HUIRoot;
  }
}
