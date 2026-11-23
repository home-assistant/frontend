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
import { SkeletonLoadingController } from "../components/skeleton/skeleton-loading-controller";
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
import { getEnergyDataCollection, hasCombinableEnergySources } from "./energy";
import type { FrontendLocaleData } from "./translation";
import type { HomeAssistant } from "../types";

export interface EnergyCollectionControllerOptions {
  /** Subscribed only while this returns a config. */
  config: () => { collection_key?: string } | undefined;
  beforeSubscribe?: (collection: EnergyCollection) => void;
  onData: (data: EnergyData) => void;
  /** Whether the host still loads once the data came, such as while it
      fetches more for it. The host shows a skeleton until it's done. */
  loading?: () => boolean;
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

  private _unsubPrefs?: () => void;

  private _collection?: EnergyCollection;

  /* Whether data has come since subscribing, so the host can show a
     skeleton until it does */
  private _hasData = false;

  private _placeholderData?: EnergyData;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    options: EnergyCollectionControllerOptions
  ) {
    super(host);
    this._options = options;
    new SkeletonLoadingController(
      host,
      () =>
        this._unsub !== undefined &&
        (!this._hasData || this._options.loading?.() === true)
    );
  }

  get collection(): EnergyCollection | undefined {
    return this._collection;
  }

  /**
   * The data the host is about to get, without its statistics, once the
   * collection knows the energy preferences. A host can draw its real layout
   * from it under its skeleton, so the skeleton has the size of what comes.
   * The host updates when the preferences arrive.
   */
  get placeholderData(): EnergyData | undefined {
    const collection = this._collection;
    const prefs = collection?.prefs;

    if (!collection || !prefs || this._hasData) {
      return undefined;
    }

    // The same object each time, so hosts don't redraw for nothing
    const cached = this._placeholderData;

    if (
      cached?.prefs === prefs &&
      cached.start === collection.start &&
      cached.end === collection.end
    ) {
      return cached;
    }

    this._placeholderData = {
      start: collection.start,
      end: collection.end,
      prefs,
      combineSources: hasCombinableEnergySources(prefs)
        ? collection.combineSources
        : undefined,
      info: { cost_sensors: {}, solar_forecast_domains: [] },
      stats: {},
      statsMetadata: {},
      waterUnit: "",
      gasUnit: "",
    };

    return this._placeholderData;
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
    this._hasData = false;
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

    // So the host can draw its layout from the preferences before its data
    this._unsubPrefs = this._collection.subscribePrefs(() => {
      if (!this._hasData) {
        this.host.requestUpdate();
      }
    });

    this._unsub = this._collection.subscribe((data) => {
      this._hasData = true;
      this._options.onData(data);
      // So the skeleton goes even if the host keeps nothing new
      this.host.requestUpdate();
    });

    // So the host shows a skeleton until the data comes
    if (!this._hasData) {
      this.host.requestUpdate();
    }
  }

  private _unsubscribe(): void {
    this._unsubPrefs?.();
    this._unsubPrefs = undefined;
    this._unsub?.();
    this._unsub = undefined;
  }
}
