import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { goBack, navigate } from "../../common/navigate";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-icon";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-tab-group";
import "../../components/ha-tab-group-tab";
import type { LovelaceDashboardStrategyConfig } from "../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../data/lovelace/config/view";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import { generateLovelaceDashboardStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/hui-lovelace";

const HOME_LOVELACE_CONFIG: LovelaceDashboardStrategyConfig = {
  strategy: {
    type: "home",
  },
};

@customElement("ha-panel-home")
class PanelHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @state() private _curView?: number;

  @state() private _lovelace?: Lovelace;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
      this._setLovelace();
      return;
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
      return;
    }

    if (oldHass && this.hass) {
      // If the entity registry changed, ask the user if they want to refresh the config
      if (
        oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors
      ) {
        if (this.hass.config.state === "RUNNING") {
          this._debounceRegistriesChanged();
          return;
        }
      }
      // If ha started, refresh the config
      if (
        this.hass.config.state === "RUNNING" &&
        oldHass.config.state !== "RUNNING"
      ) {
        this._setLovelace();
      }
    }
  }

  private _debounceRegistriesChanged = debounce(
    () => this._registriesChanged(),
    200
  );

  private _registriesChanged = async () => {
    this._setLovelace();
  };

  private _isVisible = (view: LovelaceViewConfig) =>
    Boolean(
      view.visible === undefined ||
        view.visible === true ||
        (Array.isArray(view.visible) &&
          view.visible.some((show) => show.user === this.hass.user?.id))
    );

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!this._lovelace || !this.route) {
      return;
    }

    let viewPath: string | undefined = this.route.path.split("/")[1];
    viewPath = viewPath ? decodeURI(viewPath) : undefined;

    if (changedProperties.has("route")) {
      const views = this._lovelace.config.views;

      if (!viewPath && views.length) {
        // No path: navigate to first visible view
        const newSelectView = views.findIndex(this._isVisible);
        this._navigateToView(views[newSelectView].path || newSelectView, true);
      } else if (viewPath) {
        // Match by path or index
        const selectedView = viewPath;
        const selectedViewInt = Number(selectedView);
        let index = 0;
        for (let i = 0; i < views.length; i++) {
          if (views[i].path === selectedView || i === selectedViewInt) {
            index = i;
            break;
          }
        }
        this._curView = index;
      }
    }
  }

  private _navigateToView(path: string | number, replace?: boolean) {
    if (!this.route) {
      return;
    }
    const url = `${this.route.prefix}/${path}${location.search}`;
    const currentUrl = `${location.pathname}${location.search}`;
    if (currentUrl !== url) {
      navigate(url, { replace });
    }
  }

  private _handleViewSelected(ev) {
    ev.preventDefault();
    const viewIndex = Number(ev.detail.name);
    if (viewIndex !== this._curView && this._lovelace?.config.views) {
      const path = this._lovelace.config.views[viewIndex].path || viewIndex;
      this._navigateToView(path);
    } else {
      scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  private _goBack(): void {
    const views = this._lovelace?.config.views ?? [];
    const curViewConfig =
      typeof this._curView === "number" ? views[this._curView] : undefined;

    if (curViewConfig?.back_path != null) {
      navigate(curViewConfig.back_path, { replace: true });
    } else if (history.length > 1) {
      goBack();
    } else if (views[0] && !views[0].subview) {
      navigate(this.route!.prefix, { replace: true });
    } else {
      navigate("/");
    }
  }

  protected render() {
    if (!this._lovelace) {
      return nothing;
    }

    const views = this._lovelace.config.views;
    const curViewConfig =
      typeof this._curView === "number" ? views[this._curView] : undefined;

    // Helper function to determine if a tab should be hidden for user
    const _isTabHiddenForUser = (view: LovelaceViewConfig) =>
      view.visible === false ||
      (Array.isArray(view.visible) &&
        !view.visible.some((show) => show.user === this.hass.user?.id));

    const tabs = html`<ha-tab-group @wa-tab-show=${this._handleViewSelected}>
      ${views.map((view, index) => {
        const hidden = view.subview || _isTabHiddenForUser(view);
        return html`
          <ha-tab-group-tab
            slot="nav"
            panel=${index}
            .active=${this._curView === index}
            .disabled=${hidden}
            aria-label=${ifDefined(view.title)}
            class=${classMap({
              icon: Boolean(view.icon),
              "hide-tab": Boolean(hidden),
            })}
          >
            ${view.icon
              ? html`<ha-icon
                  class=${classMap({
                    "child-view-icon": Boolean(view.subview),
                  })}
                  title=${ifDefined(view.title)}
                  .icon=${view.icon}
                ></ha-icon>`
              : view.title ||
                this.hass.localize("ui.panel.lovelace.views.unnamed_view")}
          </ha-tab-group-tab>
        `;
      })}
    </ha-tab-group>`;

    const isSubview = curViewConfig?.subview;
    const hasTabViews = views.filter((view) => !view.subview).length > 1;

    return html`
      <div class="header">
        <div class="toolbar">
          ${this._searchParms.has("historyBack") || isSubview
            ? html`
                <ha-icon-button-arrow-prev
                  .hass=${this.hass}
                  slot="navigationIcon"
                  @click=${this._goBack}
                ></ha-icon-button-arrow-prev>
              `
            : html`
                <ha-menu-button
                  slot="navigationIcon"
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                ></ha-menu-button>
              `}
          ${isSubview
            ? html`<div class="main-title">${curViewConfig.title}</div>`
            : hasTabViews
              ? tabs
              : html`<div class="main-title">
                  ${views[0]?.title ?? this.hass.localize("panel.home")}
                </div>`}
        </div>
      </div>

      <hui-lovelace
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .curView=${this._curView}
      ></hui-lovelace>
    `;
  }

  private async _setLovelace() {
    const config = await generateLovelaceDashboardStrategy(
      HOME_LOVELACE_CONFIG,
      this.hass
    );

    const rawConfig = HOME_LOVELACE_CONFIG;

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: "home",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
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
          background-color: var(--app-header-background-color);
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          position: fixed;
          top: 0;
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-right,
                0px
              )
          );
          padding-top: var(--safe-area-inset-top);
          z-index: 4;
          transition: box-shadow 200ms linear;
          display: flex;
          flex-direction: row;
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
          padding-top: var(--safe-area-inset-top);
          padding-right: var(--safe-area-inset-right);
        }
        :host([narrow]) .header {
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-left,
                0px
              ) - var(--safe-area-inset-right, 0px)
          );
          padding-left: var(--safe-area-inset-left);
        }
        :host([scrolled]) .header {
          box-shadow: var(
            --mdc-top-app-bar-fixed-box-shadow,
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12)
          );
        }
        .toolbar {
          height: var(--header-height);
          display: flex;
          flex: 1;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 0px 12px;
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
        }
        :host([narrow]) .toolbar {
          padding: 0 4px;
        }
        .main-title {
          margin: var(--margin-title);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }
        ha-tab-group {
          margin-left: 12px;
          margin-inline-start: 12px;
          margin-inline-end: initial;
          flex: 1;
          max-width: 100%;
        }
        ha-tab-group-tab {
          --mdc-icon-size: 20px;
          max-width: 200px;
        }
        ha-tab-group-tab.icon {
          height: 48px;
        }
        ha-tab-group-tab.hide-tab {
          display: none;
        }
        .child-view-icon {
          font-size: 16px;
        }
        hui-lovelace {
          position: relative;
          display: flex;
          min-height: 100vh;
          box-sizing: border-box;
          padding-top: calc(var(--header-height) + var(--safe-area-inset-top));
          padding-right: var(--safe-area-inset-right);
          padding-inline-end: var(--safe-area-inset-right);
          padding-bottom: var(--safe-area-inset-bottom);
        }
        :host([narrow]) hui-lovelace {
          padding-left: var(--safe-area-inset-left);
          padding-inline-start: var(--safe-area-inset-left);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-home": PanelHome;
  }
}
