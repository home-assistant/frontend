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
import {
  fetchHassioAddonInfo,
  HassioAddonDetails,
} from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import {
  createHassioSession,
  validateHassioSession,
} from "../../../src/data/hassio/ingress";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";
import { HomeAssistant, Route } from "../../../src/types";

const STATUS_BAD_GATEWAY = 502;
const TIMEOUT = 60000;

@customElement("hassio-ingress-view")
class HassioIngressView extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public ingressPanel = false;

  @state() private _addon?: HassioAddonDetails;

  @property({ type: Boolean })
  public narrow = false;

  private _sessionKeepAlive?: number;

  private _resolveIngressURL: {
    status?: number;
    time?: number;
    interval?: number;
  } = {};

  public disconnectedCallback() {
    super.disconnectedCallback();

    if (this._sessionKeepAlive) {
      clearInterval(this._sessionKeepAlive);
      this._sessionKeepAlive = undefined;
    }
    if (this._resolveIngressURL.interval) {
      clearInterval(this._resolveIngressURL.interval);
    }
  }

  public connectedCallback() {
    super.connectedCallback();

    this._resolveURL();
    this._resolveIngressURL.interval = window.setInterval(async () => {
      await this._resolveURL();
    }, 1000);
  }

  private async _resolveURL(): Promise<void> {
    if (!this._addon) {
      return;
    }

    if (this._addon.state !== "started") {
      clearInterval(this._resolveIngressURL.interval);
      await showAlertDialog(this, {
        text:
          this.hass.localize("supervisor_ingress.not_running") ||
          "The add-on is not running, please start it.",
        title: this._addon.name,
        confirmText:
          this.hass.localize("supervisor_ingress.go_to_dashboard") ||
          "Go to add-on dashboard",
      });
      await nextRender();
      navigate(`/hassio/addon/${this._addon.slug}/info`, { replace: true });
      return;
    }

    if (this._resolveIngressURL.status !== STATUS_BAD_GATEWAY) {
      if (this._resolveIngressURL.interval) {
        clearInterval(this._resolveIngressURL.interval);
      }
    }

    if (
      this._resolveIngressURL.time &&
      new Date().getTime() > this._resolveIngressURL.time + TIMEOUT
    ) {
      await showAlertDialog(this, {
        text:
          this.hass.localize("supervisor_ingress.timeout") ||
          "Timeout while waiting for add-on to start, check the add-on logs",
        title: this._addon.name,
        confirmText:
          this.hass.localize("supervisor_ingress.go_to_logs") ||
          "Go to add-on logs",
      });
      await nextRender();
      navigate(`/hassio/addon/${this._addon.slug}/logs`, { replace: true });
      return;
    }

    try {
      const response = await fetch(this._addon.ingress_url!);
      this._resolveIngressURL.status = response.status;
      await this._fetchData(this._addon.slug);
    } catch (err) {
      // eslint-disable-next-line
      console.error(err);
    }
  }

  protected render(): TemplateResult {
    if (!this._addon || this._resolveIngressURL.status === STATUS_BAD_GATEWAY) {
      return html`
        <hass-loading-screen
          .narrow=${this.narrow}
          .header=${this._addon?.name}
        >
          ${this._resolveIngressURL.status === STATUS_BAD_GATEWAY
            ? html`<p>
                ${this.hass.localize("supervisor_ingress.waiting") ||
                "Waiting for add-on to start"}
              </p>`
            : ""}
        </hass-loading-screen>
      `;
    }

    const iframe = html`<iframe src=${this._addon.ingress_url!}></iframe>`;

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
            <mwc-icon-button
              aria-label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              @click=${this._toggleMenu}
            >
              <ha-svg-icon .path=${mdiMenu}></ha-svg-icon>
            </mwc-icon-button>
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
        } catch (err) {
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("route")) {
      return;
    }

    const addon = this.route.path.substr(1);

    const oldRoute = changedProps.get("route") as this["route"] | undefined;
    const oldAddon = oldRoute ? oldRoute.path.substr(1) : undefined;

    if (addon && addon !== oldAddon) {
      this._fetchData(addon);
    }
  }

  private async _fetchData(addonSlug: string) {
    const createSessionPromise = createHassioSession(this.hass);

    let addon;

    try {
      addon = await fetchHassioAddonInfo(this.hass, addonSlug);
    } catch (err) {
      await showAlertDialog(this, {
        text:
          this.hass.localize("supervisor_ingress.unable_to_fetch") ||
          "Unable to fetch add-on info to start Ingress",
        title: "Supervisor",
      });
      await nextRender();
      history.back();
      return;
    }

    if (!addon.ingress_url) {
      await showAlertDialog(this, {
        text:
          this.hass.localize("supervisor_ingress.no_ingress") ||
          "Add-on does not support Ingress",
        title: addon.name,
      });
      await nextRender();
      history.back();
      return;
    }

    if (addon.state !== "started") {
      await showAlertDialog(this, {
        text:
          this.hass.localize("supervisor_ingress.not_running") ||
          "The add-on is not running, please start it.",
        title: addon.name,
      });
      await nextRender();
      navigate(`/hassio/addon/${addon.slug}/info`, { replace: true });
      return;
    }

    let session;

    try {
      session = await createSessionPromise;
    } catch (err) {
      await showAlertDialog(this, {
        text:
          this.hass.localize("supervisor_ingress.unable_to_create") ||
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
      } catch (err) {
        session = await createHassioSession(this.hass);
      }
    }, 60000);

    this._addon = addon;
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

      mwc-icon-button {
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
