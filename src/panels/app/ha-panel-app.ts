import { mdiMenu } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { createRef, ref } from "lit/directives/ref";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
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
import "../../layouts/hass-subpage";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { computeRouteTail } from "../../data/route";

interface AppPanelConfig {
  addon?: string;
}

// Time to wait for app to start before we ask the user if we should try again
const START_WAIT_TIME = 20000; // ms
const RETRY_START_WAIT_TIME = 5000; // ms

@customElement("ha-panel-app")
class HaPanelApp extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel!: PanelInfo<AppPanelConfig>;

  @property({ type: Boolean }) public narrow = false;

  @state() private _addon?: HassioAddonDetails;

  @state() private _loadingMessage?: string;

  @state() private _hideToolbar = false;

  private _sessionKeepAlive?: number;

  private _fetchDataTimeout?: number;

  private _autoRetryUntil?: number;

  private _iframeRef = createRef<HTMLIFrameElement>();

  /**
   * iFrames can subscribe to Home Assistant specific updates
   */
  private _iframeSubscribeUpdates = false;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    // Send property updates to iframe when narrow or route changes
    if (
      this._iframeSubscribeUpdates &&
      (changedProps.has("narrow") || changedProps.has("route"))
    ) {
      this._sendPropertiesToIframe();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("message", this._handleIframeMessage);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("message", this._handleIframeMessage);

    if (this._sessionKeepAlive) {
      clearInterval(this._sessionKeepAlive);
      this._sessionKeepAlive = undefined;
    }
    if (this._fetchDataTimeout) {
      clearTimeout(this._fetchDataTimeout);
      this._fetchDataTimeout = undefined;
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
      ${!this._hideToolbar &&
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
        : nothing}
      <iframe
        title=${this._addon.name}
        src=${this._addon.ingress_url!}
        @load=${this._checkLoaded}
        ${ref(this._iframeRef)}
      >
      </iframe>
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("route") && !changedProps.has("panel")) {
      return;
    }

    const addon = this._getAddonSlug();

    const oldRoute = changedProps.get("route") as this["route"] | undefined;
    const oldPanel = changedProps.get("panel") as this["panel"] | undefined;
    const oldAddon = this._getAddonSlugFromRoutePanel(oldRoute, oldPanel);

    if (addon && addon !== oldAddon) {
      this._loadingMessage = undefined;
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
    // First check panel config (for dedicated add-on panels)
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

  private async _fetchData(addonSlug: string) {
    const createSessionPromise = createHassioSession(this.hass);

    let addon: HassioAddonDetails;

    try {
      addon = await fetchHassioAddonInfo(this.hass, addonSlug);
    } catch (err: any) {
      await this.updateComplete;
      await showAlertDialog(this, {
        text: extractApiErrorMessage(err),
        title: addonSlug,
      });
      await nextRender();
      navigate("/", { replace: true });
      return;
    }

    if (!addon.version) {
      await this.updateComplete;
      await showAlertDialog(this, {
        text: this.hass.localize("ui.panel.app.error_app_not_installed"),
        title: addon.name,
      });
      await nextRender();
      navigate("/", { replace: true });
      return;
    }

    if (!addon.ingress_url) {
      await this.updateComplete;
      await showAlertDialog(this, {
        text: this.hass.localize("ui.panel.app.error_app_no_ingress"),
        title: addon.name,
      });
      await nextRender();
      navigate("/", { replace: true });
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
          await startHassioAddon(this.hass, addonSlug);
          this._fetchData(addonSlug);
          return;
        } catch (_err) {
          await showAlertDialog(this, {
            text: this.hass.localize("ui.panel.app.error_starting_app"),
            title: addon.name,
          });
          await nextRender();
          navigate("/", { replace: true });
          return;
        }
      } else {
        await nextRender();
        navigate("/", { replace: true });
        return;
      }
    }

    if (addon.state === "startup") {
      // Addon is starting up, wait for it to start
      this._loadingMessage = this.hass.localize("ui.panel.app.app_starting");

      this._fetchDataTimeout = window.setTimeout(() => {
        this._fetchData(addonSlug);
      }, 500);
      return;
    }

    if (addon.state !== "started") {
      return;
    }

    this._loadingMessage = undefined;

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
      await showAlertDialog(this, {
        text: this.hass.localize("ui.panel.app.error_creating_session"),
        title: addon.name,
      });
      await nextRender();
      navigate("/", { replace: true });
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

  private async _checkLoaded(ev): Promise<void> {
    if (
      !this._addon ||
      ev.target.contentDocument.body.textContent !== "502: Bad Gateway"
    ) {
      return;
    }

    // Auto-retry if within the retry window
    if (this._autoRetryUntil && Date.now() < this._autoRetryUntil) {
      this._reloadIframe();
      return;
    }

    // Clear auto-retry window and show dialog
    this._autoRetryUntil = undefined;

    await this.updateComplete;
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.app.error_app_not_ready"),
      title: this._addon.name,
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
    const addon = this._addon;
    this._addon = undefined;
    await Promise.all([
      this.updateComplete,
      new Promise((resolve) => {
        setTimeout(resolve, 1000);
      }),
    ]);
    this._addon = addon;
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
        this._hideToolbar = data.hideToolbar ?? false;
        this._sendPropertiesToIframe();
        break;

      case "home-assistant/unsubscribe-properties":
        this._iframeSubscribeUpdates = false;
        this._hideToolbar = false;
        break;
    }
  };

  private _sendPropertiesToIframe() {
    if (!this._iframeRef.value?.contentWindow) {
      return;
    }

    this._iframeRef.value.contentWindow.postMessage(
      {
        type: "home-assistant/properties",
        narrow: this.narrow,
        route: this._computeRouteTail(this.route),
      },
      "*"
    );
  }

  private _computeRouteTail = memoizeOne(computeRouteTail);

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }

    .header + iframe {
      height: calc(100% - 40px);
    }

    .header {
      display: flex;
      align-items: center;
      font-size: var(--ha-font-size-l);
      height: 40px;
      padding: 0 16px;
      pointer-events: none;
      background-color: var(--app-header-background-color);
      font-weight: var(--ha-font-weight-normal);
      color: var(--app-header-text-color, white);
      border-bottom: var(--app-header-border-bottom, none);
      box-sizing: border-box;
      --mdc-icon-size: 20px;
    }

    .main-title {
      margin: var(--margin-title);
      line-height: var(--ha-line-height-condensed);
      flex-grow: 1;
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
