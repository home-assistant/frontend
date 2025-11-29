import { mdiMenu } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
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

interface AppPanelConfig {
  addon?: string;
}

@customElement("ha-panel-app")
class HaPanelApp extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel!: PanelInfo<AppPanelConfig>;

  @property({ type: Boolean }) public narrow = false;

  @state() private _addon?: HassioAddonDetails;

  @state() private _loadingMessage?: string;

  private _sessionKeepAlive?: number;

  private _fetchDataTimeout?: number;

  public disconnectedCallback() {
    super.disconnectedCallback();

    if (this._sessionKeepAlive) {
      clearInterval(this._sessionKeepAlive);
      this._sessionKeepAlive = undefined;
    }
    if (this._fetchDataTimeout) {
      clearInterval(this._fetchDataTimeout);
      this._fetchDataTimeout = undefined;
    }
  }

  protected render(): TemplateResult {
    if (!this._addon) {
      return html`<hass-loading-screen
        .message=${this._loadingMessage}
      ></hass-loading-screen>`;
    }

    const iframe = html`<iframe
      title=${this._addon.name}
      src=${this._addon.ingress_url!}
      @load=${this._checkLoaded}
    >
    </iframe>`;

    return this.narrow || this.hass.dockedSidebar === "always_hidden"
      ? html`
          <div class="header">
            <ha-icon-button
              .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              .path=${mdiMenu}
              @click=${this._toggleMenu}
            ></ha-icon-button>
            <div class="main-title">${this._addon.name}</div>
          </div>
          ${iframe}
        `
      : iframe;
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
      const slug = route.path.substring(1);
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
      clearInterval(this._fetchDataTimeout);
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
    if (!this._addon) {
      return;
    }
    if (ev.target.contentDocument.body.textContent === "502: Bad Gateway") {
      await this.updateComplete;
      showConfirmationDialog(this, {
        text: this.hass.localize("ui.panel.app.error_app_not_ready"),
        title: this._addon.name,
        confirmText: this.hass.localize("ui.panel.app.retry"),
        dismissText: this.hass.localize("ui.common.no"),
        confirm: async () => {
          const addon = this._addon;
          this._addon = undefined;
          await Promise.all([
            this.updateComplete,
            new Promise((resolve) => {
              setTimeout(resolve, 500);
            }),
          ]);
          this._addon = addon;
        },
      });
    }
  }

  private _toggleMenu(): void {
    fireEvent(this, "hass-toggle-menu");
  }

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
