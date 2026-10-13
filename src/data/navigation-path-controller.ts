import type {
  Connection,
  HassConfig,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import {
  consumeContext,
  ContextController,
} from "../common/decorators/consume";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  DEFAULT_NAVIGATION_PATH_INFO,
  subscribeNavigationPathInfo,
  type NavigationPathInfo,
} from "./compute-navigation-path-info";
import {
  configContext,
  connectionContext,
  internationalizationContext,
  registriesContext,
  uiContext,
} from "./context";
import type { HomeAssistant, HomeAssistantRegistries } from "../types";

/**
 * Reactive controller that keeps `NavigationPathInfo` in sync with a
 * navigation path. Resolves synchronously first, then subscribes to
 * lovelace config updates for view paths.
 *
 * Pulls localize, panels, registries, config and connection from Lit
 * context, so the caller only needs to feed in the path via `update()`.
 */
export class NavigationPathInfoController extends ContextController {
  @consumeContext({
    context: internationalizationContext,
    subscribe: true,
    transform: ({ localize }) => localize,
  })
  private _localize?: LocalizeFunc;

  @consumeContext({
    context: uiContext,
    subscribe: true,
    transform: ({ panels }) => panels,
  })
  private _panels?: HomeAssistant["panels"];

  @consumeContext({ context: registriesContext, subscribe: true })
  private _registries?: HomeAssistantRegistries;

  @consumeContext({
    context: configContext,
    subscribe: true,
    transform: ({ config }) => config,
  })
  private _config?: HassConfig;

  @consumeContext({
    context: connectionContext,
    subscribe: true,
    transform: ({ connection }) => connection,
  })
  private _connection?: Connection;

  private _info: NavigationPathInfo = DEFAULT_NAVIGATION_PATH_INFO;

  private _unsub?: UnsubscribeFunc;

  private _path?: string;

  get info(): NavigationPathInfo {
    return this._info;
  }

  update(path: string | undefined): void {
    if (path === this._path) return;
    this._path = path;
    this._resolve();
  }

  hostConnected(): void {
    this._resolve();
  }

  hostDisconnected(): void {
    this._unsubscribe();
  }

  // The resolved info depends on every consumed value, so re-resolve.
  protected contextUpdated(): void {
    this._resolve();
  }

  private _resolve(): void {
    this._unsubscribe();

    if (!this._path) {
      if (this._info !== DEFAULT_NAVIGATION_PATH_INFO) {
        this._info = DEFAULT_NAVIGATION_PATH_INFO;
        this.host.requestUpdate();
      }
      return;
    }

    if (
      !this._localize ||
      !this._panels ||
      !this._registries ||
      !this._config ||
      !this._connection
    ) {
      return;
    }

    this._unsub = subscribeNavigationPathInfo(
      {
        localize: this._localize,
        panels: this._panels,
        areas: this._registries.areas,
        devices: this._registries.devices,
        config: this._config,
        connection: this._connection,
      },
      this._path,
      (info) => {
        this._info = info;
        this.host.requestUpdate();
      }
    );
  }

  private _unsubscribe(): void {
    this._unsub?.();
    this._unsub = undefined;
  }
}
