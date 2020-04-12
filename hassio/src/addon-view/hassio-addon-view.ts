import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner-lite";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HomeAssistant, Route } from "../../../src/types";
import {
  HassioAddonDetails,
  fetchHassioAddonInfo,
} from "../../../src/data/hassio/addon";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { PageNavigation } from "../../../src/layouts/hass-tabs-subpage";
import { getAddonSections } from "./data/hassio-addon-sections";

import "./hassio-addon-router";

@customElement("hassio-addon-view")
class HassioAddonView extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public addon?: HassioAddonDetails;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`
        <paper-spinner-lite active></paper-spinner-lite>
      `;
    }

    const route: Route = {
      prefix: `${this.route.prefix}/${this.addon.slug}`,
      path: this.addon
        ? this.route.path.substr(1).replace(this.addon.slug, "")
        : "",
    };

    const sections: PageNavigation[] = getAddonSections(this.addon);

    return html`
      <hassio-addon-router
        .hass=${this.hass}
        .sections=${sections}
        .route=${route}
        .addon=${this.addon}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .showAdvanced=${this.showAdvanced}
      ></hassio-addon-router>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          color: var(--primary-text-color);
          --paper-card-header-color: var(--primary-text-color);
        }
        paper-spinner-lite {
          position: absolute;
          top: calc(50% - 14px);
          left: calc(50% - 14px);
        }
      `,
    ];
  }

  protected async firstUpdated(): Promise<void> {
    await this._routeDataChanged(this.route);
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  private async _apiCalled(ev): Promise<void> {
    const path: string = ev.detail.path;

    if (!path) {
      return;
    }

    if (path === "uninstall") {
      history.back();
    } else {
      await this._routeDataChanged(this.route);
    }
  }

  private async _routeDataChanged(routeData: Route): Promise<void> {
    let addon = routeData.path.substr(1);
    if (addon.includes("/")) {
      addon = addon.substring(0, addon.indexOf("/"));
    }
    try {
      const addoninfo = await fetchHassioAddonInfo(this.hass, addon);
      this.addon = addoninfo;
    } catch {
      this.addon = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-view": HassioAddonView;
  }
}
