import { mdiMenu } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { navigate } from "../../../src/common/navigate";
import { extractSearchParam } from "../../../src/common/url/search-params";
import { nextRender } from "../../../src/common/util/render-status";
import "../../../src/components/ha-icon-button";
import {
  fetchHassioAddonInfo,
  HassioAddonDetails,
  startHassioAddon,
} from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import {
  createHassioSession,
  validateHassioSession,
} from "../../../src/data/hassio/ingress";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";
import { HomeAssistant, Route } from "../../../src/types";

@customElement("hassio-ingress-view")
class HassioIngressView extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public ingressPanel = false;

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

    if (!this.ingressPanel) {
      return html`<hass-subpage
        .hass=${this.hass}
        .header=${this._addon.name}
        .narrow=${this.narrow}
      >
        ${iframe}
      </hass-subpage>`;
    }

    return html`${this.narrow || this.hass.dockedSidebar === "always_hidden"
      ? html`<div class="header">
            <ha-icon-button
              .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              .path=${mdiMenu}
              @click=${this._toggleMenu}
            ></ha-icon-button>
            <div class="main-title">${this._addon.name}</div>
          </div>
          ${iframe}`
      : iframe}`;
  }

  protected async firstUpdated(): Promise<void> {
    if (this.route.path === "") {
      const requestedAddon = extractSearchParam("addon");
      let addonInfo: HassioAddonDetails;
      if (requestedAddon) {
        try {
          addonInfo = await fetchHassioAddonInfo(this.hass, requestedAddon);
        } catch (err: any) {
          await showAlertDialog(this, {
            text: extractApiErrorMessage(err),
            title: requestedAddon,
          });
          await nextRender();
          navigate("/hassio/store", { replace: true });
          return;
        }
        if (!addonInfo.version) {
          await showAlertDialog(this, {
            text: this.supervisor.localize("my.error_addon_not_installed"),
            title: addonInfo.name,
          });
          await nextRender();
          navigate(`/hassio/addon/${addonInfo.slug}/info`, { replace: true });
        } else if (!addonInfo.ingress) {
          await showAlertDialog(this, {
            text: this.supervisor.localize("my.error_addon_no_ingress"),
            title: addonInfo.name,
          });
          await nextRender();
          navigate(`/hassio/addon/${addonInfo.slug}/info`, { replace: true });
        } else {
          navigate(`/hassio/ingress/${addonInfo.slug}`, { replace: true });
        }
      }
    }
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("route")) {
      return;
    }

    const addon = this.route.path.substring(1);

    const oldRoute = changedProps.get("route") as this["route"] | undefined;
    const oldAddon = oldRoute ? oldRoute.path.substring(1) : undefined;

    if (addon && addon !== oldAddon) {
      this._loadingMessage = undefined;
      this._fetchData(addon);
    }
  }

  private async _fetchData(addonSlug: string) {
    const createSessionPromise = createHassioSession(this.hass);

    let addon: HassioAddonDetails;

    try {
      addon = await fetchHassioAddonInfo(this.hass, addonSlug);
    } catch (err: any) {
      await this.updateComplete;
      await showAlertDialog(this, {
        text:
          this.supervisor.localize("ingress.error_addon_info") ||
          "Unable to fetch add-on info to start Ingress",
        title: "Supervisor",
      });
      await nextRender();
      navigate("/hassio/store", { replace: true });
      return;
    }

    if (!addon.version) {
      await this.updateComplete;
      await showAlertDialog(this, {
        text:
          this.supervisor.localize("ingress.error_addon_not_installed") ||
          "The add-on is not installed. Please install it first",
        title: addon.name,
      });
      await nextRender();
      navigate(`/hassio/addon/${addon.slug}/info`, { replace: true });
      return;
    }

    if (!addon.ingress_url) {
      await this.updateComplete;
      await showAlertDialog(this, {
        text:
          this.supervisor.localize("ingress.error_addon_not_supported") ||
          "This add-on does not support Ingress",
        title: addon.name,
      });
      await nextRender();
      history.back();
      return;
    }

    if (!addon.state || !["startup", "started"].includes(addon.state)) {
      await this.updateComplete;
      const confirm = await showConfirmationDialog(this, {
        text:
          this.supervisor.localize("ingress.error_addon_not_running") ||
          "The add-on is not running. Do you want to start it now?",
        title: addon.name,
        confirmText:
          this.supervisor.localize("ingress.start_addon") || "Start add-on",
        dismissText: this.supervisor.localize("common.no") || "No",
      });
      if (confirm) {
        try {
          this._loadingMessage =
            this.supervisor.localize("ingress.addon_starting") ||
            "The add-on is starting, this can take some time...";
          await startHassioAddon(this.hass, addonSlug);
          fireEvent(this, "supervisor-collection-refresh", {
            collection: "addon",
          });
          this._fetchData(addonSlug);
          return;
        } catch (e) {
          await showAlertDialog(this, {
            text:
              this.supervisor.localize("ingress.error_starting_addon") ||
              "Error starting the add-on",
            title: addon.name,
          });
          await nextRender();
          navigate(`/hassio/addon/${addon.slug}/logs`, { replace: true });
          return;
        }
      } else {
        await nextRender();
        navigate(`/hassio/addon/${addon.slug}/info`, { replace: true });
        return;
      }
    }

    if (addon.state === "startup") {
      // Addon is starting up, wait for it to start
      this._loadingMessage =
        this.supervisor.localize("ingress.addon_starting") ||
        "The add-on is starting, this can take some time...";

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
    } catch (err: any) {
      if (this._sessionKeepAlive) {
        clearInterval(this._sessionKeepAlive);
      }
      await showAlertDialog(this, {
        text:
          this.supervisor.localize("ingress.error_creating_session") ||
          "Unable to create an Ingress session",
        title: addon.name,
      });
      await nextRender();
      history.back();
      return;
    }

    if (this._sessionKeepAlive) {
      clearInterval(this._sessionKeepAlive);
    }
    this._sessionKeepAlive = window.setInterval(async () => {
      try {
        await validateHassioSession(this.hass, session);
      } catch (err: any) {
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
        text:
          this.supervisor.localize("ingress.error_addon_not_ready") ||
          "The add-on seems to not be ready, it might still be starting. Do you want to try again?",
        title: this._addon.name,
        confirmText: this.supervisor.localize("ingress.retry") || "Retry",
        dismissText: this.supervisor.localize("common.no") || "No",
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

  static get styles(): CSSResultGroup {
    return css`
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
        font-size: 16px;
        height: 40px;
        padding: 0 16px;
        pointer-events: none;
        background-color: var(--app-header-background-color);
        font-weight: 400;
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
        box-sizing: border-box;
        --mdc-icon-size: 20px;
      }

      .main-title {
        margin: 0 0 0 24px;
        line-height: 20px;
        flex-grow: 1;
      }

      ha-icon-button {
        pointer-events: auto;
      }

      hass-subpage {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
        --app-header-border-bottom: 1px solid var(--divider-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-ingress-view": HassioIngressView;
  }
}
