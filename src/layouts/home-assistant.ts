import { html, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { navigate } from "../common/navigate";
import { getStorageDefaultPanelUrlPath } from "../data/panel";
import "../resources/custom-card-support";
import { HassElement } from "../state/hass-element";
import QuickBarMixin from "../state/quick-bar-mixin";
import { HomeAssistant, Route } from "../types";
import { storeState } from "../util/ha-pref-storage";
import {
  registerServiceWorker,
  supportsServiceWorker,
} from "../util/register-service-worker";
import "./ha-init-page";
import "./home-assistant-main";

const useHash = __DEMO__;
const curPath = () =>
  window.decodeURIComponent(
    useHash ? location.hash.substr(1) : location.pathname
  );

const panelUrl = (path: string) => {
  const dividerPos = path.indexOf("/", 1);
  return dividerPos === -1 ? path.substr(1) : path.substr(1, dividerPos - 1);
};

@customElement("home-assistant")
export class HomeAssistantAppEl extends QuickBarMixin(HassElement) {
  @state() private _route: Route;

  @state() private _error = false;

  private _panelUrl: string;

  private _haVersion?: string;

  private _hiddenTimeout?: number;

  private _visiblePromiseResolve?: () => void;

  constructor() {
    super();
    const path = curPath();

    if (["", "/"].includes(path)) {
      navigate(`/${getStorageDefaultPanelUrlPath()}`, { replace: true });
    }
    this._route = {
      prefix: "",
      path,
    };
    this._panelUrl = panelUrl(path);
  }

  protected render() {
    const hass = this.hass;

    return hass && hass.states && hass.config && hass.services
      ? html`
          <home-assistant-main
            .hass=${this.hass}
            .route=${this._route}
          ></home-assistant-main>
        `
      : html`<ha-init-page .error=${this._error}></ha-init-page>`;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._initializeHass();
    setTimeout(() => registerServiceWorker(this), 1000);
    /* polyfill for paper-dropdown */
    import("web-animations-js/web-animations-next-lite.min");
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
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("hass")) {
      this.hassChanged(
        this.hass!,
        changedProps.get("hass") as HomeAssistant | undefined
      );
    }
  }

  protected hassConnected() {
    super.hassConnected();
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

  protected async _initializeHass() {
    try {
      let result;

      if (window.hassConnection) {
        result = await window.hassConnection;
      } else {
        // In the edge case that
        result = await new Promise((resolve) => {
          window.hassConnectionReady = resolve;
        });
      }

      const { auth, conn } = result;
      this._haVersion = conn.haVersion;
      this.initializeHass(auth, conn);
    } catch (err: any) {
      this._error = true;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "home-assistant": HomeAssistantAppEl;
  }
}
