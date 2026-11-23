import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveControllerHost } from "lit";
import {
  consumeContext,
  ContextController,
} from "../common/decorators/consume";
import { connectionContext } from "./context";

export interface ConnectionSubscriptionControllerOptions {
  /** Subscribed only while this returns true; re-evaluated after each host update. */
  enabled?: () => boolean;
  subscribe: (
    connection: Connection
  ) => UnsubscribeFunc | Promise<UnsubscribeFunc>;
}

/**
 * Subscribes the host to a websocket subscription while it is connected,
 * using the connection from context. Replaces `SubscribeMixin` for
 * components that no longer take `hass`.
 */
export class ConnectionSubscriptionController extends ContextController {
  @consumeContext({
    context: connectionContext,
    subscribe: true,
    transform: ({ connection }) => connection,
  })
  private _connection?: Connection;

  private _options: ConnectionSubscriptionControllerOptions;

  private _connected = false;

  private _subscribedConnection?: Connection;

  private _unsub?: UnsubscribeFunc | Promise<UnsubscribeFunc>;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    options: ConnectionSubscriptionControllerOptions
  ) {
    super(host);
    this._options = options;
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
    this._subscribe();
  }

  private _subscribe(): void {
    if (
      !this._connected ||
      !this._connection ||
      this._options.enabled?.() === false
    ) {
      this._unsubscribe();
      return;
    }
    if (this._unsub && this._subscribedConnection === this._connection) {
      return;
    }
    this._unsubscribe();
    this._subscribedConnection = this._connection;
    this._unsub = this._options.subscribe(this._connection);
  }

  private _unsubscribe(): void {
    const unsub = this._unsub;
    this._unsub = undefined;
    this._subscribedConnection = undefined;
    if (!unsub) {
      return;
    }
    if (unsub instanceof Promise) {
      unsub.then((unsubFunc) => unsubFunc());
    } else {
      unsub();
    }
  }
}
