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
import { createHassioSession } from "../../../src/data/hassio/supervisor";
import {
  HassioAddonDetails,
  fetchHassioAddonInfo,
} from "../../../src/data/hassio/addon";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";

@customElement("hassio-ingress-view")
class HassioIngressView extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() private _addon?: HassioAddonDetails;

  protected render(): TemplateResult | void {
    if (!this._addon) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }

    return html`
      <hass-subpage .header=${this._addon.name} hassio>
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
      this._fetchData(addon);
    }
  }

  private async _fetchData(addonSlug: string) {
    try {
      const [addon] = await Promise.all([
        fetchHassioAddonInfo(this.hass, addonSlug).catch(() => {
          throw new Error("Failed to fetch add-on info");
        }),
        createHassioSession(this.hass).catch(() => {
          throw new Error("Failed to create an ingress session");
        }),
      ]);

      if (!addon.ingress) {
        throw new Error("This add-on does not support ingress");
      }

      this._addon = addon;
    } catch (err) {
      // tslint:disable-next-line
      console.error(err);
      alert(err.message || "Unknown error starting ingress.");
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
