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
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import { navigate } from "../../../src/common/navigate";
import { classMap } from "lit-html/directives/class-map";

@customElement("hassio-ingress-view")
class HassioIngressView extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public route!: Route;

  @internalProperty() private _addon?: HassioAddonDetails;

  @property({ type: Boolean })
  public narrow = false;

  protected render(): TemplateResult {
    if (!this._addon) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }
    return html`
      <hass-subpage
        .rootnav=${!location.pathname.startsWith("/hassio/ingress")}
        .hass=${this.hass}
        .header=${this._addon.name}
        .narrow=${this.narrow}
        class=${classMap({
          config: location.pathname.startsWith("/hassio/ingress"),
        })}
      >
        <iframe src=${this._addon.ingress_url!}></iframe>
      </hass-subpage>
    `;
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
    const createSessionPromise = createHassioSession(this.hass).then(
      () => true,
      () => false
    );

    let addon;

    try {
      addon = await fetchHassioAddonInfo(this.hass, addonSlug);
    } catch (err) {
      await showAlertDialog(this, {
        text: "Unable to fetch add-on info to start Ingress",
        title: "Supervisor",
      });
      history.back();
      return;
    }

    if (!addon.ingress_url) {
      await showAlertDialog(this, {
        text: "Add-on does not support Ingress",
        title: addon.name,
      });
      history.back();
      return;
    }

    if (addon.state !== "started") {
      await showAlertDialog(this, {
        text: "Add-on is not running. Please start it first",
        title: addon.name,
      });
      navigate(this, `/hassio/addon/${addon.slug}/info`, true);
      return;
    }

    if (!(await createSessionPromise)) {
      await showAlertDialog(this, {
        text: "Unable to create an Ingress session",
        title: addon.name,
      });
      history.back();
      return;
    }

    this._addon = addon;
  }

  static get styles(): CSSResult {
    return css`
      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
      }

      hass-subpage.config {
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
