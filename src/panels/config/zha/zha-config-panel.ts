import "../../../layouts/hass-loading-screen";

import { customElement, property } from "lit-element";

import { listenMediaQuery } from "../../../common/dom/media_query";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";

@customElement("zha-config-panel")
class ZHAConfigPanel extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public _wideSidebar: boolean = false;
  @property() public _wide: boolean = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "configuration",
    cacheAll: true,
    preloadAll: true,
    routes: {
      configuration: {
        tag: "ha-config-zha",
        load: () =>
          import(/* webpackChunkName: "zha-configuration-page" */ "./ha-config-zha"),
      },
      add: {
        tag: "zha-add-devices-page",
        load: () =>
          import(/* webpackChunkName: "zha-add-devices-page" */ "./zha-add-devices-page"),
      },
    },
  };

  private _listeners: Array<() => void> = [];

  public connectedCallback(): void {
    super.connectedCallback();
    this._listeners.push(
      listenMediaQuery("(min-width: 1040px)", (matches) => {
        this._wide = matches;
      })
    );
    this._listeners.push(
      listenMediaQuery("(min-width: 1296px)", (matches) => {
        this._wideSidebar = matches;
      })
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    while (this._listeners.length) {
      this._listeners.pop()!();
    }
  }

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.hass.dockedSidebar ? this._wideSidebar : this._wide;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-panel": ZHAConfigPanel;
  }
}
