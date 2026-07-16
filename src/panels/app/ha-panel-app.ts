import { mdiMenu } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { computeRouteTail } from "../../common/url/route";
import { nextRender } from "../../common/util/render-status";
import "../../components/ha-icon-button";
import type { HassioAddonDetails } from "../../data/hassio/addon";
import {
  fetchHassioAddonInfo,
  startHassioAddon,
} from "../../data/hassio/addon";
import { extractApiErrorMessage } from "../../data/hassio/common";
import {
  createHassioSession,
  validateHassioSession,
} from "../../data/hassio/ingress";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import "../../layouts/hass-loading-screen";
import type { HomeAssistant, PanelInfo, Route } from "../../types";

interface AppPanelConfig {
  addon?: string;
}

// Time to wait for app to start before we ask the user if we should try again
const START_WAIT_TIME = 30000; // ms
const RETRY_START_WAIT_TIME = 5000; // ms

@customElement("ha-panel-app")
class HaPanelApp extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel!: PanelInfo<AppPanelConfig>;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _addon?: HassioAddonDetails;

  @state() private _loadingMessage?: string;

  @state() private _kioskMode = false;

  @state() private _iframeLoaded = false;

  // Set when the addon signals (via subscribe-properties) that it handles the
  // safe-area insets itself. We then stop padding the iframe and forward the
  // inset values so the addon can draw into the safe area.
  @state() private _handleSafeArea = false;

  private _enabledKioskMode = false;

  private _sessionKeepAlive?: number;

  private _fetchDataTimeout?: number;

  private _autoRetryUntil?: number;

  private _iframeRef = createRef<HTMLIFrameElement>();

  /**
   * iFrames can subscribe to Home Assistant specific updates
   */
  private _iframeSubscribeUpdates = false;

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    // Send property updates to iframe when narrow or route changes
    if (
      this._iframeSubscribeUpdates &&
      (changedProps.has("narrow") || changedProps.has("route"))
    ) {
      this._sendPropertiesToIframe();
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && oldHass.kioskMode !== this.hass.kioskMode) {
      this._kioskMode = this.hass.kioskMode;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("message", this._handleIframeMessage);
    window.addEventListener("resize", this._handleResize);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("message", this._handleIframeMessage);
    window.removeEventListener("resize", this._handleResize);

    if (this._sessionKeepAlive) {
      clearInterval(this._sessionKeepAlive);
      this._sessionKeepAlive = undefined;
    }
    if (this._fetchDataTimeout) {
      clearTimeout(this._fetchDataTimeout);
      this._fetchDataTimeout = undefined;
    }
    if (this._enabledKioskMode) {
      fireEvent(window, "hass-kiosk-mode", { enable: false });
    }
  }

  protected render(): TemplateResult {
    if (!this._addon) {
      return html`<hass-loading-screen
        .message=${this._loadingMessage}
      ></hass-loading-screen>`;
    }

    // Make sure this all is 1 template so hiding toolbar doesn't reload iframe
    return html`
      ${
        !this._kioskMode &&
        (this.narrow || this.hass.dockedSidebar === "always_hidden")
          ? html`
              <div class="header">
                <ha-icon-button
                  .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
                  .path=${mdiMenu}
                  @click=${this._toggleMenu}
                ></ha-icon-button>
                <div class="main-title">${this._addon.name}</div>
              </div>
            `
          : nothing
      }
      <iframe
        class=${classMap({
          loaded: this._iframeLoaded,
          "kiosk-mode": this._kioskMode,
          "handle-safe-area": this._handleSafeArea,
        })}
        title=${this._addon.name}
        src=${this._addon.ingress_url!}
        @load=${this._checkLoaded}
        ${ref(this._iframeRef)}
      >
      </iframe>
      ${
        !this._iframeLoaded
          ? html`<hass-loading-screen
              class="loading-overlay"
              .message=${this._loadingMessage}
            ></hass-loading-screen>`
          : nothing
      }
    `;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (!changedProps.has("route") && !changedProps.has("panel")) {
      return;
    }

    const addon = this._getAddonSlug();

    const oldRoute = changedProps.has("route")
      ? (changedProps.get("route") as this["route"] | undefined)
      : this.route;
    const oldPanel = changedProps.has("panel")
      ? (changedProps.get("panel") as this["panel"] | undefined)
      : this.panel;
    const oldAddon = this._getAddonSlugFromRoutePanel(oldRoute, oldPanel);

    if (addon && addon !== oldAddon) {
      this._loadingMessage = undefined;
      this._iframeLoaded = false;
      // Reset state when switching apps
      if (this._enabledKioskMode) {
        fireEvent(window, "hass-kiosk-mode", { enable: false });
        this._enabledKioskMode = false;
      }
      this._iframeSubscribeUpdates = false;
      this._handleSafeArea = false;
      this._autoRetryUntil = undefined;
      this._fetchData(addon);
    }
  }

  private _getAddonSlug(): string | undefined {
    return this._getAddonSlugFromRoutePanel(this.route, this.panel);
  }

  private _getAddonSlugFromRoutePanel(
    route?: Route,
    panel?: PanelInfo<AppPanelConfig>
  ): string | undefined {
    // First check panel config (for dedicated app panels)
    if (panel?.config?.addon) {
      return panel.config.addon;
    }
    // Fall back to route path (e.g., /app/core_configurator)
    if (route?.path) {
      const dividerPos = route.path.indexOf("/", 1);
      const slug =
        dividerPos === -1
          ? route.path.substring(1)
          : route.path.substring(1, dividerPos);
      if (slug) {
        return slug;
      }
    }
    return undefined;
  }

  private async _showErrorAndNavigateHome(title: string, text: string) {
    await this.updateComplete;
    await showAlertDialog(this, { title, text });
    await nextRender();
    navigate("/", { replace: true });
  }

  private async _fetchData(addonSlug: string) {
    const createSessionPromise = createHassioSession(this.hass);

    let addon: HassioAddonDetails;

    try {
      addon = await fetchHassioAddonInfo(this.hass.callWS, addonSlug);
    } catch (err: any) {
      await this._showErrorAndNavigateHome(
        addonSlug,
        extractApiErrorMessage(err)
      );
      return;
    }

    if (!addon.version) {
      await this._showErrorAndNavigateHome(
        addon.name,
        this.hass.localize("ui.panel.app.error_app_not_installed")
      );
      return;
    }

    if (!addon.ingress_url) {
      await this._showErrorAndNavigateHome(
        addon.name,
        this.hass.localize("ui.panel.app.error_app_no_ingress")
      );
      return;
    }

    if (!addon.state || !["startup", "started"].includes(addon.state)) {
      await this.updateComplete;
      const confirm = await showConfirmationDialog(this, {
        text: this.hass.localize("ui.panel.app.error_app_not_running"),
        title: addon.name,
        confirmText: this.hass.localize("ui.panel.app.start_app"),
        dismissText: this.hass.localize("ui.common.no"),
      });
      if (confirm) {
        try {
          this._loadingMessage = this.hass.localize(
            "ui.panel.app.app_starting"
          );
          // Set auto-retry window for after starting the app
          this._autoRetryUntil = Date.now() + START_WAIT_TIME;
          await startHassioAddon(this.hass.callWS, addonSlug);
          this._fetchData(addonSlug);
          return;
        } catch (_err) {
          await this._showErrorAndNavigateHome(
            addon.name,
            this.hass.localize("ui.panel.app.error_starting_app")
          );
          return;
        }
      } else {
        await nextRender();
        navigate("/", { replace: true });
        return;
      }
    }

    if (addon.state === "startup") {
      // App is starting up, wait for it to start
      this._loadingMessage = this.hass.localize("ui.panel.app.app_starting");

      this._fetchDataTimeout = window.setTimeout(() => {
        this._fetchData(addonSlug);
      }, 500);
      return;
    }

    if (addon.state !== "started") {
      return;
    }

    if (this._fetchDataTimeout) {
      clearTimeout(this._fetchDataTimeout);
      this._fetchDataTimeout = undefined;
    }

    let session: string;

    try {
      session = await createSessionPromise;
    } catch (_err: any) {
      if (this._sessionKeepAlive) {
        clearInterval(this._sessionKeepAlive);
      }
      await this._showErrorAndNavigateHome(
        addon.name,
        this.hass.localize("ui.panel.app.error_creating_session")
      );
      return;
    }

    // Check if user navigated away while we were fetching
    if (this._getAddonSlug() !== addonSlug) {
      return;
    }

    if (this._sessionKeepAlive) {
      clearInterval(this._sessionKeepAlive);
    }
    this._sessionKeepAlive = window.setInterval(async () => {
      try {
        await validateHassioSession(this.hass, session);
      } catch (_err: any) {
        session = await createHassioSession(this.hass);
      }
    }, 60000);

    this._addon = addon;
  }

  private async _checkLoaded(ev: Event): Promise<void> {
    const iframe = ev.target as HTMLIFrameElement;

    const is502 =
      !!this._addon &&
      iframe.contentDocument?.body.textContent === "502: Bad Gateway";

    // While the app is still starting, reload the iframe silently behind the
    // loading screen instead of revealing the error page and tearing down
    // the panel.
    if (is502 && this._autoRetryUntil && Date.now() < this._autoRetryUntil) {
      this._reloadIframe();
      return;
    }

    this._iframeLoaded = true;

    if (!is502) {
      return;
    }

    // Retry window elapsed, ask the user whether to keep waiting.
    this._autoRetryUntil = undefined;

    await this.updateComplete;
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.app.error_app_not_ready"),
      title: this._addon!.name,
      confirmText: this.hass.localize("ui.panel.app.retry"),
      dismissText: this.hass.localize("ui.common.no"),
      confirm: () => {
        // Set auto-retry window for a bit more time.
        this._autoRetryUntil = Date.now() + RETRY_START_WAIT_TIME;
        this._reloadIframe();
      },
    });
  }

  private async _reloadIframe(): Promise<void> {
    const addonSlug = this._addon!.slug;
    this._iframeLoaded = false;
    this._loadingMessage = this.hass.localize("ui.panel.app.app_starting");
    await Promise.all([
      this.updateComplete,
      new Promise((resolve) => {
        setTimeout(resolve, 1000);
      }),
    ]);
    // Guard for user navigating away during the delay
    if (this._getAddonSlug() !== addonSlug) {
      return;
    }
    // Reload the iframe content in place so the loading screen stays up
    // without rebuilding the panel.
    const iframeWindow = this._iframeRef.value?.contentWindow;
    if (iframeWindow) {
      iframeWindow.location.reload();
    } else {
      this._fetchData(addonSlug);
    }
  }

  private _toggleMenu(): void {
    fireEvent(this, "hass-toggle-menu");
  }

  private _handleIframeMessage = (event: MessageEvent) => {
    if (event.source !== this._iframeRef.value?.contentWindow) {
      return;
    }
    const { type, ...data } = event.data;

    switch (type) {
      case "home-assistant/navigate":
        navigate(data.path, data.options);
        break;

      case "home-assistant/toggle-menu":
        this._toggleMenu();
        break;

      case "home-assistant/subscribe-properties":
        this._iframeSubscribeUpdates = true;
        // An addon can opt out of the container padding and take care of the
        // safe area itself; we then forward the inset values below.
        this._handleSafeArea = !!data.handleSafeArea;
        this._sendPropertiesToIframe();
        if (data.kioskMode && !this.hass.kioskMode) {
          this._enabledKioskMode = true;
          fireEvent(window, "hass-kiosk-mode", { enable: true });
        }
        break;

      case "home-assistant/unsubscribe-properties":
        this._iframeSubscribeUpdates = false;
        this._handleSafeArea = false;
        if (this._enabledKioskMode) {
          fireEvent(window, "hass-kiosk-mode", { enable: false });
          this._enabledKioskMode = false;
        }
        break;
    }
  };

  // Safe-area insets can change on orientation change; keep a subscribing
  // addon in sync.
  private _handleResize = () => {
    if (this._iframeSubscribeUpdates) {
      this._sendPropertiesToIframe();
    }
  };

  private _sendPropertiesToIframe() {
    if (!this._iframeRef.value?.contentWindow) {
      return;
    }

    const styles = getComputedStyle(this);
    this._iframeRef.value.contentWindow.postMessage(
      {
        type: "home-assistant/properties",
        narrow: this.narrow,
        route: this._computeRouteTail(this.route),
        // Resolved insets so an addon that handles the safe area itself can
        // apply them. Vertical uses the raw insets, horizontal the content
        // variables (the docked sidebar already absorbs its side).
        safeAreaInsets: {
          top: styles.getPropertyValue("--safe-area-inset-top").trim(),
          right:
            styles.getPropertyValue("--safe-area-content-inset-right").trim() ||
            styles.getPropertyValue("--safe-area-inset-right").trim(),
          bottom: styles.getPropertyValue("--safe-area-inset-bottom").trim(),
          left:
            styles.getPropertyValue("--safe-area-content-inset-left").trim() ||
            styles.getPropertyValue("--safe-area-inset-left").trim(),
        },
      },
      "*"
    );
  }

  private _computeRouteTail = memoizeOne(computeRouteTail);

  static styles = css`
    :host {
      display: block;
      height: 100%;
      position: relative;
    }

    hass-loading-screen.loading-overlay {
      position: absolute;
      inset: 0;
    }

    /* Keep the addon iframe clear of the device safe areas. CSS variables don't
       cross the iframe boundary, so this padding on the iframe element is the
       only way to inset the embedded document. Vertical uses the raw insets;
       horizontal uses the content variables, since the docked sidebar already
       absorbs the inset on its side (avoids doubling it). */
    iframe {
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border: 0;
      background-color: var(--primary-background-color);
      opacity: 0;
      transition: opacity var(--ha-animation-duration-normal) ease;
      padding: var(--safe-area-inset-top)
        var(--safe-area-content-inset-right, var(--safe-area-inset-right))
        var(--safe-area-inset-bottom)
        var(--safe-area-content-inset-left, var(--safe-area-inset-left));
    }

    iframe.loaded {
      opacity: 1;
    }

    /* The addon takes care of the safe area itself (it receives the insets via
       postMessage), so drop the container padding to let it draw full-bleed. */
    iframe.handle-safe-area {
      padding: 0;
    }

    /* When the header is shown it already covers the top inset. */
    .header + iframe {
      padding-top: 0;
      height: calc(100% - 40px - var(--safe-area-inset-top, 0px));
    }

    .header {
      display: flex;
      align-items: center;
      font-size: var(--ha-font-size-l);
      height: calc(40px + var(--safe-area-inset-top, 0px));
      padding: var(--safe-area-inset-top)
        calc(
          16px +
            var(--safe-area-content-inset-right, var(--safe-area-inset-right))
        )
        0
        calc(
          16px +
            var(--safe-area-content-inset-left, var(--safe-area-inset-left))
        );
      pointer-events: none;
      background-color: var(--app-header-background-color);
      font-weight: var(--ha-font-weight-normal);
      color: var(--app-header-text-color, white);
      border-bottom: var(--app-header-border-bottom, none);
      box-sizing: border-box;
      --mdc-icon-size: 20px;
    }

    .main-title {
      margin-inline-start: var(--ha-space-6);
      line-height: var(--ha-line-height-condensed);
      flex-grow: 1;
    }
    .narrow .main-title {
      margin-inline-start: var(--ha-space-2);
    }

    ha-icon-button {
      pointer-events: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-app": HaPanelApp;
  }
}
