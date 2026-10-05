import type { Context } from "@lit/context";
import type {
  Connection,
  HassConfig,
  HassEntities,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { ContextSubscriptionController } from "../common/decorators/consume";
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

type EnergyCollectionHost = ReactiveControllerHost & HTMLElement;

export interface EnergyCollectionControllerOptions {
  /** Subscribing waits until this returns a config. */
  config: () => { collection_key?: string } | undefined;
  onData: (data: EnergyData) => void;
}

/**
 * Subscribes the host to its energy collection while it is connected. The host
 * may be the first subscriber, so this consumes everything needed to create
 * the collection.
 */
export class EnergyCollectionController implements ReactiveController {
  private _host: EnergyCollectionHost;

  private _options: EnergyCollectionControllerOptions;

  private _connection?: Connection;

  private _panelUrl?: string;

  private _callWS?: HomeAssistant["callWS"];

  private _entities?: HomeAssistant["entities"];

  private _states?: HassEntities;

  private _locale?: FrontendLocaleData;

  private _hassConfig?: HassConfig;

  private _connected = false;

  private _key?: string;

  private _unsub?: UnsubscribeFunc;

  private _collection?: EnergyCollection;

  constructor(
    host: EnergyCollectionHost,
    options: EnergyCollectionControllerOptions
  ) {
    this._host = host;
    this._options = options;

    // Added before this controller, so values are fresh when it connects.
    this._consume(connectionContext, ({ connection }) => {
      this._connection = connection;
    });
    this._consume(uiContext, ({ panelUrl }) => {
      this._panelUrl = panelUrl;
    });
    this._consume(apiContext, ({ callWS }) => {
      this._callWS = callWS;
    });
    this._consume(entitiesContext, (entities) => {
      this._entities = entities;
    });
    this._consume(statesContext, (states) => {
      this._states = states;
    });
    this._consume(internationalizationContext, ({ locale }) => {
      this._locale = locale;
    });
    this._consume(configContext, ({ config }) => {
      this._hassConfig = config;
    });

    host.addController(this);
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

  private _consume<T>(
    context: Context<unknown, T>,
    assign: (value: T) => void
  ): void {
    new ContextSubscriptionController(this._host, context, (value) => {
      assign(value);
      if (!this._unsub) {
        this._subscribe();
      }
    });
  }

  private _subscribe(): void {
    const config = this._options.config();
    if (
      !this._connected ||
      !config ||
      !this._connection ||
      !this._callWS ||
      !this._entities ||
      !this._states ||
      !this._locale ||
      !this._hassConfig
    ) {
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
    this._unsub = this._collection.subscribe(this._options.onData);
  }

  private _unsubscribe(): void {
    this._unsub?.();
    this._unsub = undefined;
  }
}
