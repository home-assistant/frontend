import { html, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { navigate } from "../common/navigate";
import { getStorageDefaultPanelUrlPath } from "../data/panel";
import { getRecorderInfo, RecorderInfo } from "../data/recorder";
import "../resources/custom-card-support";
import { HassElement } from "../state/hass-element";
import QuickBarMixin from "../state/quick-bar-mixin";
import { HomeAssistant, Route } from "../types";
import { WindowWithPreloads } from "../data/preloads";
import { storeState } from "../util/ha-pref-storage";
import {
  renderLaunchScreenInfoBox,
  removeLaunchScreen,
} from "../util/launch-screen";
import {
  registerServiceWorker,
  supportsServiceWorker,
} from "../util/register-service-worker";
import "./ha-init-page";
import "./home-assistant-main";

const useHash = __DEMO__;
const curPath = () =>
  useHash ? location.hash.substring(1) : location.pathname;

const panelUrl = (path: string) => {
  const dividerPos = path.indexOf("/", 1);
  return dividerPos === -1 ? path.substring(1) : path.substring(1, dividerPos);
};

@customElement("home-assistant")
export class HomeAssistantAppEl extends QuickBarMixin(HassElement) {
  @state() private _route: Route;

  @state() private _databaseMigration?: boolean;

  private _panelUrl: string;

  private _haVersion?: string;

  private _hiddenTimeout?: number;

  private _visiblePromiseResolve?: () => void;

  constructor() {
    super();
    const path = curPath();

    if (["", "/"].includes(path)) {
      navigate(`/${getStorageDefaultPanelUrlPath()}${location.search}`, {
        replace: true,
      });
    }
    this._route = {
      prefix: "",
      path,
    };
    this._panelUrl = panelUrl(path);
  }

  protected renderHass() {
    return html`
      <home-assistant-main
        .hass=${this.hass}
        .route=${this._route}
      ></home-assistant-main>
    `;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (
      this._databaseMigration === undefined &&
      changedProps.has("hass") &&
      this.hass?.config &&
      changedProps.get("hass")?.config !== this.hass?.config
    ) {
      this.checkDataBaseMigration();
    }
  }

  protected update(changedProps: PropertyValues<this>) {
    if (
      this.hass?.states &&
      this.hass.config &&
      this.hass.services &&
      this._databaseMigration === false
    ) {
      this.render = this.renderHass;
      this.update = super.update;
      removeLaunchScreen();
    }
    super.update(changedProps);
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._initializeHass();
    setTimeout(() => registerServiceWorker(this), 1000);

    this.addEventListener("hass-suspend-when-hidden", (ev) => {
      this._updateHass({ suspendWhenHidden: ev.detail.suspend });
      storeState(this.hass!);
    });

    // Navigation
    const updateRoute = (path = curPath()) => {
      if (this._route && path === this._route.path) {
        return;
      }
      this._route = {
        prefix: "",
        path: path,
      };

      this._panelUrl = panelUrl(path);
      this.panelUrlChanged(this._panelUrl!);
      this._updateHass({ panelUrl: this._panelUrl });
    };

    window.addEventListener("location-changed", () => updateRoute());

    // Handle history changes
    if (useHash) {
      window.addEventListener("hashchange", () => updateRoute());
    } else {
      window.addEventListener("popstate", () => updateRoute());
    }

    // Handle clicking on links
    window.addEventListener("click", (ev) => {
      const href = isNavigationClick(ev);
      if (href) {
        navigate(href);
      }
    });

    // Render launch screen info box (loading data / error message)
    // if Home Assistant is not loaded yet.
    if (this.render !== this.renderHass) {
      this._renderInitInfo(false);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("hass")) {
      this.hassChanged(
        this.hass!,
        changedProps.get("hass") as HomeAssistant | undefined
      );
    }
    if (changedProps.has("_databaseMigration")) {
      if (this.render !== this.renderHass) {
        this._renderInitInfo(false);
      } else if (this._databaseMigration) {
        // we already removed the launch screen, so we refresh to add it again to show the migration screen
        location.reload();
      }
    }
  }

  protected hassConnected() {
    super.hassConnected();
    // @ts-ignore
    this._loadHassTranslations(this.hass!.language, "entity_component");
    // @ts-ignore
    this._loadHassTranslations(this.hass!.language, "entity");

    // Backwards compatibility for custom integrations
    // @ts-ignore
    this._loadHassTranslations(this.hass!.language, "state");

    document.addEventListener(
      "visibilitychange",
      () => this._checkVisibility(),
      false
    );
    document.addEventListener("freeze", () => this._suspendApp());
    document.addEventListener("resume", () => this._checkVisibility());
  }

  protected hassReconnected() {
    super.hassReconnected();

    // If backend has been upgraded, make sure we update frontend
    if (this.hass!.connection.haVersion !== this._haVersion) {
      if (supportsServiceWorker()) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          } else {
            // @ts-ignore Firefox supports forceGet
            location.reload(true);
          }
        });
      } else {
        // @ts-ignore Firefox supports forceGet
        location.reload(true);
      }
    }
  }

  protected async checkDataBaseMigration() {
    if (this.hass?.config?.components.includes("recorder")) {
      let recorderInfoProm: Promise<RecorderInfo> | undefined;
      const preloadWindow = window as WindowWithPreloads;
      // On first load, we speed up loading page by having recorderInfoProm ready
      if (preloadWindow.recorderInfoProm) {
        recorderInfoProm = preloadWindow.recorderInfoProm;
        preloadWindow.recorderInfoProm = undefined;
      }
      const info = await (recorderInfoProm ||
        getRecorderInfo(this.hass.connection));
      this._databaseMigration =
        info.migration_in_progress && !info.migration_is_live;
      if (this._databaseMigration) {
        // check every 5 seconds if the migration is done
        setTimeout(() => this.checkDataBaseMigration(), 5000);
      }
    } else {
      this._databaseMigration = false;
    }
  }

  protected async _initializeHass() {
    try {
      let result;

      if (window.hassConnection) {
        result = await window.hassConnection;
      } else {
        // In the edge case that core.ts loads before app.ts
        result = await new Promise((resolve) => {
          window.hassConnectionReady = resolve;
        });
      }

      const { auth, conn } = result;
      this._haVersion = conn.haVersion;
      this.initializeHass(auth, conn);
    } catch (err: any) {
      this._renderInitInfo(true);
    }
  }

  protected _checkVisibility() {
    if (document.hidden) {
      // If the document is hidden, we will prevent reconnects until we are visible again
      this._onHidden();
    } else {
      this._onVisible();
    }
  }

  private _onHidden() {
    if (this._visiblePromiseResolve) {
      return;
    }
    this.hass!.connection.suspendReconnectUntil(
      new Promise((resolve) => {
        this._visiblePromiseResolve = resolve;
      })
    );
    if (this.hass!.suspendWhenHidden !== false) {
      // We close the connection to Home Assistant after being hidden for 5 minutes
      this._hiddenTimeout = window.setTimeout(() => {
        this._hiddenTimeout = undefined;
        // setTimeout can be delayed in the background and only fire
        // when we switch to the tab or app again (Hey Android!)
        if (document.hidden) {
          this._suspendApp();
        }
      }, 300000);
    }
    window.addEventListener("focus", () => this._onVisible(), { once: true });
  }

  private _suspendApp() {
    if (!this.hass!.connection.connected) {
      return;
    }
    window.stop();
    this.hass!.connection.suspend();
  }

  private _onVisible() {
    // Clear timer to close the connection
    if (this._hiddenTimeout) {
      clearTimeout(this._hiddenTimeout);
      this._hiddenTimeout = undefined;
    }
    // Unsuspend the reconnect
    if (this._visiblePromiseResolve) {
      this._visiblePromiseResolve();
      this._visiblePromiseResolve = undefined;
    }
  }

  private _renderInitInfo(error: boolean) {
    renderLaunchScreenInfoBox(
      html`<ha-init-page
        .error=${error}
        .migration=${this._databaseMigration}
      ></ha-init-page>`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-assistant": HomeAssistantAppEl;
  }
}
