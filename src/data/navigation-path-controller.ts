import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
  DEFAULT_NAVIGATION_PATH_INFO,
  subscribeNavigationPathInfo,
  type NavigationPathInfo,
} from "./compute-navigation-path-info";
import type { HomeAssistant } from "../types";

/**
 * Reactive controller that keeps `NavigationPathInfo` in sync with a
 * navigation path. Resolves synchronously first, then subscribes to
 * lovelace config updates for view paths.
 */
export class NavigationPathInfoController implements ReactiveController {
  private _host: ReactiveControllerHost;

  private _hass?: HomeAssistant;

  private _info: NavigationPathInfo = DEFAULT_NAVIGATION_PATH_INFO;

  private _unsub?: UnsubscribeFunc;

  private _subscribedPath?: string;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  get info(): NavigationPathInfo {
    return this._info;
  }

  update(hass: HomeAssistant, path: string | undefined): void {
    this._hass = hass;

    if (path === this._subscribedPath) return;

    this._unsub?.();
    this._unsub = undefined;
    this._subscribedPath = path;

    if (!path) {
      this._info = DEFAULT_NAVIGATION_PATH_INFO;
      return;
    }

    this._unsub = subscribeNavigationPathInfo(hass, path, (info) => {
      this._info = info;
      this._host.requestUpdate();
    });
  }

  hostConnected(): void {
    if (this._hass && this._subscribedPath && !this._unsub) {
      const path = this._subscribedPath;
      this._subscribedPath = undefined;
      this.update(this._hass, path);
    }
  }

  hostDisconnected(): void {
    this._unsub?.();
    this._unsub = undefined;
  }
}
