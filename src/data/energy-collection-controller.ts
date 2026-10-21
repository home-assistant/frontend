import type {
  Connection,
  HassConfig,
  HassEntities,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { ReactiveControllerHost } from "lit";
import {
  consumeContext,
  ContextController,
} from "../common/decorators/consume";
import {
  apiContext,
  configContext,
  connectionContext,
  entitiesContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "./context";
import type { EnergyCollection, EnergyData } from "./energy";
import { getEnergyDataCollection } from "./energy";
import type { FrontendLocaleData } from "./translation";
import type { HomeAssistant } from "../types";

export interface EnergyCollectionControllerOptions {
  /** Subscribed only while this returns a config. */
  config: () => { collection_key?: string } | undefined;
  beforeSubscribe?: (collection: EnergyCollection) => void;
  onData: (data: EnergyData) => void;
}

/**
 * Subscribes the host to its energy collection while it is connected. The host
 * may be the first subscriber, so this consumes everything needed to create
 * the collection.
 */
export class EnergyCollectionController extends ContextController {
  @consumeContext({
    context: connectionContext,
    subscribe: true,
    transform: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @consumeContext({
    context: uiContext,
    subscribe: true,
    transform: ({ panelUrl }) => panelUrl,
  })
  private _panelUrl?: string;

  @consumeContext({
    context: apiContext,
    subscribe: true,
    transform: ({ callWS }) => callWS,
  })
  private _callWS?: HomeAssistant["callWS"];

  @consumeContext({ context: entitiesContext, subscribe: true })
  private _entities?: HomeAssistant["entities"];

  @consumeContext({ context: statesContext, subscribe: true })
  private _states?: HassEntities;

  @consumeContext({
    context: internationalizationContext,
    subscribe: true,
    transform: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @consumeContext({
    context: configContext,
    subscribe: true,
    transform: ({ config }) => config,
  })
  private _hassConfig?: HassConfig;

  private _options: EnergyCollectionControllerOptions;

  private _connected?: boolean;

  private _key?: string;

  private _unsub?: UnsubscribeFunc;

  private _collection?: EnergyCollection;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    options: EnergyCollectionControllerOptions
  ) {
    super(host);
    this._options = options;
  }

  get collection(): EnergyCollection | undefined {
    return this._collection;
  }

  hostConnected(): void {
    this._connected = true;
    this._subscribe();
  }

  hostUpdated(): void {
    this._subscribe();
  }

  hostDisconnected(): void {
    this._connected = false;
    this._unsubscribe();
  }

  protected contextUpdated(): void {
    if (!this._unsub) {
      this._subscribe();
    }
  }

  private _subscribe(): void {
    if (
      !this._connected ||
      !this._connection ||
      !this._callWS ||
      !this._entities ||
      !this._states ||
      !this._locale ||
      !this._hassConfig
    ) {
      return;
    }
    const config = this._options.config();
    if (!config) {
      this._unsubscribe();
      return;
    }
    const key = config.collection_key;
    if (this._unsub && key === this._key) {
      return;
    }
    this._unsubscribe();
    this._key = key;
    this._collection = getEnergyDataCollection(this._connection, {
      callWS: this._callWS,
      entities: this._entities,
      states: this._states,
      locale: this._locale,
      config: this._hassConfig,
      panelUrl: this._panelUrl ?? "",
      key,
    });
    this._options.beforeSubscribe?.(this._collection);
    this._unsub = this._collection.subscribe(this._options.onData);
  }

  private _unsubscribe(): void {
    this._unsub?.();
    this._unsub = undefined;
  }
}
