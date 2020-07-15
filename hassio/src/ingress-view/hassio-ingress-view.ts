import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import {
  fetchHassioAddonInfo,
  HassioAddonDetails,
} from "../../../src/data/hassio/addon";
import { createHassioSession } from "../../../src/data/hassio/supervisor";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";
import { HomeAssistant, Route } from "../../../src/types";

@customElement("hassio-ingress-view")
class HassioIngressView extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route!: Route;

  @internalProperty() private _addon?: HassioAddonDetails;

  protected render(): TemplateResult {
    if (!this._addon) {
      return html` <hass-loading-screen></hass-loading-screen> `;
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
      // eslint-disable-next-line
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-ingress-view": HassioIngressView;
  }
}
