import type { Context } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
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

type EnergyCollectionHost = ReactiveControllerHost & HTMLElement;

type CollectionInputs = Parameters<typeof getEnergyDataCollection>[0];

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

  private _inputs: Partial<CollectionInputs> = {};

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
    this._consume(connectionContext, ({ connection }) => ({ connection }));
    this._consume(uiContext, ({ panelUrl }) => ({ panelUrl }));
    this._consume(apiContext, ({ callWS }) => ({ callWS }));
    this._consume(entitiesContext, (entities) => ({ entities }));
    this._consume(statesContext, (states) => ({ states }));
    this._consume(internationalizationContext, ({ locale }) => ({ locale }));
    this._consume(configContext, ({ config }) => ({ config }));

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
    pick: (value: T) => Partial<CollectionInputs>
  ): void {
    new ContextSubscriptionController(this._host, context, (value) => {
      Object.assign(this._inputs, pick(value));
      if (!this._unsub) {
        this._subscribe();
      }
    });
  }

  private _subscribe(): void {
    const config = this._options.config();
    const inputs = this._inputs;
    if (
      !this._connected ||
      !config ||
      !inputs.connection ||
      !inputs.callWS ||
      !inputs.entities ||
      !inputs.states ||
      !inputs.locale ||
      !inputs.config
    ) {
      return;
    }
    const key = config.collection_key;
    if (this._unsub && key === this._key) {
      return;
    }
    this._unsubscribe();
    this._key = key;
    this._collection = getEnergyDataCollection(
      { ...inputs } as CollectionInputs,
      { key }
    );
    this._unsub = this._collection.subscribe(this._options.onData);
  }

  private _unsubscribe(): void {
    this._unsub?.();
    this._unsub = undefined;
  }
}
