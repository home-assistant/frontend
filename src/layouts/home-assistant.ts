import type { Connection } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html } from "lit";
import { customElement, state } from "lit/decorators";
import { storage } from "../common/decorators/storage";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { navigate } from "../common/navigate";
import type { LocalizeFunc } from "../common/translations/localize";
import { fetchHttpConfig } from "../data/http";
import type { HttpConfigState } from "../data/http";
import type { WindowWithPreloads } from "../data/preloads";
import type { RecorderInfo } from "../data/recorder";
import { getRecorderInfo } from "../data/recorder";
import { showHttpPendingConfigDialog } from "../dialogs/http-pending-config/show-dialog-http-pending-config";
import "../resources/custom-card-support";
import { HassElement } from "../state/hass-element";
import QuickBarMixin from "../state/quick-bar-mixin";
import type { HomeAssistant, Route } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { renderLaunchScreenContent } from "../util/launch-screen";
import { checkOnboardingSurveyToast } from "../util/onboarding-survey";
import { reloadForUpdate } from "../util/recover-stale-build";
import {
  registerServiceWorker,
  supportsServiceWorker,
} from "../util/register-service-worker";
import "./ha-init-page";
import "./home-assistant-main";

const useHash = __DEMO__;
const curPath = () =>
  useHash ? location.hash.substring(1) : location.pathname;

// Developer tools was renamed to Tools (/config/tools) in 2026.8; it had moved
// from /developer-tools to /config in 2026.2. Redirect both old locations to
// the new one. Applied on the initial route and on every navigation so
// bookmarks and external links to the old URLs resolve too, not just in-app
// navigation.
const redirectLegacyToolsPath = (path: string): string => {
  if (path.startsWith("/config/developer-tools")) {
    return path.replace("/config/developer-tools", "/config/tools");
  }
  if (path.startsWith("/developer-tools")) {
    return path.replace("/developer-tools", "/config/tools");
  }
  return path;
};

const panelUrl = (path: string) => {
  const dividerPos = path.indexOf("/", 1);
  return dividerPos === -1 ? path.substring(1) : path.substring(1, dividerPos);
};

@customElement("home-assistant")
export class HomeAssistantAppEl extends QuickBarMixin(HassElement) {
  @state() private _route: Route;

  @state() private _databaseMigration?: boolean;

  private _httpPendingDialogOpen = false;

  private _initError = false;

  private _onboardingSurveyChecked = false;

  private _panelUrl: string;

  @storage({ key: "ha-version", state: false, subscribe: false })
  private _haVersion?: string;

  private _hiddenTimeout?: number;

  private _visiblePromiseResolve?: () => void;

  constructor() {
    super();
    const path = redirectLegacyToolsPath(curPath());

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
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (
      this._databaseMigration === undefined &&
      changedProps.has("hass") &&
      this.hass?.config &&
      oldHass?.config !== this.hass.config
    ) {
      this.checkDataBaseMigration();
    }
    // Wait for `hass.user` to first populate so the admin guard can run; it
    // arrives asynchronously after `hass.config`. `hass.user` also gets a fresh
    // reference at runtime (reconnect, profile refresh via subscribeUser), so
    // only trigger on the initial population (null -> user). Reconnect re-checks
    // come from connection-mixin, the launch-screen swap re-check from update().
    if (changedProps.has("hass") && this.hass?.user && !oldHass?.user) {
      this.checkHttpPendingConfig();
    }
    if (
      changedProps.has("hass") &&
      !this._onboardingSurveyChecked &&
      this.hass?.user &&
      this.hass.systemData
    ) {
      this._onboardingSurveyChecked = true;
      if (!__DEMO__) {
        checkOnboardingSurveyToast(this, this.hass);
      }
    }
  }

  protected update(changedProps: PropertyValues<this>) {
    const removingLaunchScreen =
      !!this.hass?.states &&
      !!this.hass.config &&
      !!this.hass.services &&
      this._databaseMigration === false;
    if (removingLaunchScreen) {
      this.render = this.renderHass;
      this.update = super.update;
      // partial-panel-resolver removes the launch screen after the first panel
      // is ready. Native apps request instant removal because their own splash
      // screen covers the frontend until frontend/loaded is sent.
    }
    super.update(changedProps);
    if (removingLaunchScreen) {
      // Surface the HTTP pending config dialog only after super.update() has
      // committed the render swap above, which clears the launch screen from
      // the shadow root. Appending the dialog before that render would let it
      // tear the freshly-added dialog straight back out of the DOM.
      this.checkHttpPendingConfig();
    }
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
      path = redirectLegacyToolsPath(path);
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
    window.addEventListener("popstate", () => updateRoute());

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
    this.addEventListener("translations-updated", () => {
      if (this.render !== this.renderHass) {
        this._renderInitInfo(this._initError);
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
    this._checkUpdate(this.hass!.connection);
  }

  private _checkUpdate(connection: Connection) {
    const oldVersion = this._haVersion;
    const currentVersion = connection.haVersion;
    // If backend has been upgraded, make sure we update frontend
    if (currentVersion !== oldVersion) {
      this._haVersion = currentVersion;
      if (supportsServiceWorker()) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          } else if (oldVersion) {
            reloadForUpdate();
          }
        });
      } else if (oldVersion) {
        reloadForUpdate();
      }
    }
  }

  protected async checkHttpPendingConfig() {
    if (__DEMO__ || this._httpPendingDialogOpen) {
      return;
    }
    // Only show once the main UI is rendered. During startup the root swaps
    // the launch screen for the app, which clears its shadow root and would
    // tear the freshly-appended dialog straight back out of the DOM (closing
    // it). When called too early we skip; the swap in update() re-runs this.
    if (this.render !== this.renderHass) {
      return;
    }
    if (!this.hass?.user?.is_admin) {
      return;
    }
    let httpConfig: HttpConfigState;
    try {
      httpConfig = await fetchHttpConfig(this.hass);
    } catch (_err) {
      // The check re-runs on the next reconnect; ignore transient failures.
      return;
    }
    // Only prompt for an active trial. A pending config with an error was
    // already reverted/failed and is kept only for display in the config form,
    // so it must not pop the confirm/revert dialog.
    if (
      !httpConfig.pending ||
      httpConfig.pending.error ||
      this._httpPendingDialogOpen
    ) {
      return;
    }
    this._httpPendingDialogOpen = true;
    showHttpPendingConfigDialog(this, {
      state: httpConfig,
      onResolved: () => {
        this._httpPendingDialogOpen = false;
      },
    });
  }

  protected async checkDataBaseMigration() {
    if (__DEMO__) {
      this._databaseMigration = false;
      return;
    }

    let recorderInfoProm: Promise<RecorderInfo> | undefined;
    const preloadWindow = window as WindowWithPreloads;
    // On first load, we speed up loading page by having recorderInfoProm ready
    if (preloadWindow.recorderInfoProm) {
      recorderInfoProm = preloadWindow.recorderInfoProm;
      preloadWindow.recorderInfoProm = undefined;
    }
    const info = await (
      recorderInfoProm || getRecorderInfo(this.hass!.connection)
    ).catch((err) => {
      // If the command failed with code unknown_command, recorder is not enabled,
      // otherwise re-throw the error
      if (err.code !== "unknown_command") throw err;
      return { migration_in_progress: false, migration_is_live: false };
    });
    this._databaseMigration =
      info.migration_in_progress && !info.migration_is_live;
    if (this._databaseMigration) {
      // check every 5 seconds if the migration is done
      setTimeout(() => this.checkDataBaseMigration(), 5000);
    }
  }

  protected async _initializeHass() {
    try {
      let result: Awaited<Window["hassConnection"]>;

      if (window.hassConnection) {
        result = await window.hassConnection;
      } else {
        // In the edge case that core.ts loads before app.ts
        result = await new Promise((resolve) => {
          window.hassConnectionReady = resolve;
        });
      }

      const { auth, conn } = result;
      this._checkUpdate(conn);
      this.initializeHass(auth, conn);
    } catch (_err: any) {
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
    this._initError = error;
    renderLaunchScreenContent(
      html`<ha-init-page
        .error=${error}
        .migration=${this._databaseMigration}
        .localize=${this._launchScreenLocalize}
      ></ha-init-page>`,
      this._launchScreenAttribution
    );
  }

  private get _launchScreenLocalize(): LocalizeFunc | undefined {
    return (this.hass ?? this._pendingHass).localize;
  }

  private get _launchScreenAttribution() {
    return (
      this._launchScreenLocalize?.("ui.init.project_from") ||
      "A project from the"
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-assistant": HomeAssistantAppEl;
  }
}
