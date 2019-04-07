import {
  LitElement,
  customElement,
  property,
  TemplateResult,
  html,
  PropertyValues,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant, Route } from "../../../src/types";
import {
  createHassioSession,
  HassioAddon,
  fetchHassioAddonInfo,
} from "../../../src/data/hassio";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";

@customElement("hassio-ingress-view")
class HassioIngressView extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route & { slug: string };
  @property() private _hasSession = false;
  @property() private _addon?: HassioAddon;

  protected render(): TemplateResult | void {
    if (!this._hasSession || !this._addon) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    return html`
      <hass-subpage .header=${this._addon.name} hassio root>
        <a .href=${this._addon.ingress_url} slot="toolbar-icon" target="_blank">
          <paper-icon-button icon="hassio:open-in-new"></paper-icon-button>
        </a>
        <iframe src=${this._addon.ingress_url}></iframe>
      </hass-subpage>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (!changedProps.has("route")) {
      return;
    }

    const addon = this.route.path.substr(1);

    const oldRoute = changedProps.get("route") as this["route"] | undefined;
    const oldAddon = oldRoute ? oldRoute.path.substr(1) : undefined;

    if (addon && addon !== oldAddon) {
      this._createSession();
      this._fetchAddonInfo(addon);
    }
  }

  private async _fetchAddonInfo(addonSlug: string) {
    try {
      const addon = await fetchHassioAddonInfo(this.hass, addonSlug);
      if (addon.ingress) {
        this._addon = addon;
      } else {
        alert("This add-on does not support ingress.");
        history.back();
      }
    } catch (err) {
      alert("Failed to fetch add-on info");
      history.back();
    }
  }

  private async _createSession() {
    try {
      await createHassioSession(this.hass);
      this._hasSession = true;
    } catch (err) {
      alert("Failed to generate a session");
      history.back();
    }
  }

  static get styles(): CSSResult {
    return css`
      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
      }
      paper-icon-button {
        color: var(--text-primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-ingress-view": HassioIngressView;
  }
}
