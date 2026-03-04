import type { Context, ContextType } from "@lit/context";
import { ContextProvider } from "@lit/context";
import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveElement } from "lit";

type SubscribeFn<T> = (
  connection: Connection,
  setValue: (value: T) => void
) => UnsubscribeFunc | Promise<UnsubscribeFunc>;

/** Delay before tearing down the WebSocket subscription after the last consumer unsubscribes. */
const IDLE_TEARDOWN_MS = 5000;

/**
 * A context provider that defers its data subscription until the first
 * consumer requests the context. This avoids unnecessary WebSocket
 * subscriptions for data that may never be needed.
 *
 * Consumers that request the context before data has loaded will have
 * their callbacks buffered and flushed once the first value arrives.
 *
 * When all subscribing consumers disconnect, the WebSocket subscription
 * is torn down after a grace period (5 s) so that transient disconnects
 * (e.g. navigating between views) don't cause unnecessary re-subscriptions.
 * If a new consumer appears within the grace period, the teardown is cancelled.
 */
export class LazyContextProvider<
  C extends Context<unknown, unknown>,
  T extends ContextType<C> = ContextType<C>,
> {
  private _provider: ContextProvider<C>;

  private _context: C;

  private _loaded = false;

  private _subscribing = false;

  private _connection?: Connection;

  private _unsubscribe?: UnsubscribeFunc;

  private _subscribeFn: SubscribeFn<T>;

  /** Number of currently active subscribing consumers. */
  private _subscriberCount = 0;

  /** Timer handle for the idle teardown grace period. */
  private _teardownTimer?: ReturnType<typeof setTimeout>;

  private _pendingCallbacks: {
    callback: (value: T, unsubscribe?: () => void) => void;
    consumerHost: Element;
    subscribe?: boolean;
  }[] = [];

  constructor(
    private _host: ReactiveElement,
    options: { context: C; initialValue?: T; subscribeFn: SubscribeFn<T> }
  ) {
    this._context = options.context;
    this._subscribeFn = options.subscribeFn;

    // Listen for context-request events BEFORE the ContextProvider does,
    // so we can intercept requests when data hasn't loaded yet and
    // wrap subscribing callbacks to track consumer count.
    this._host.addEventListener(
      "context-request",
      this._onContextRequest as EventListener
    );

    // Create the underlying ContextProvider without an initial value.
    // The provider's internal value will be undefined until data loads.
    this._provider = new ContextProvider(this._host, {
      context: options.context,
      initialValue: options.initialValue,
    });
  }

  /**
   * Set the connection reference. Called from hassConnected().
   * Does not start subscribing -- that only happens when a consumer
   * requests the context.
   */
  setConnection(connection: Connection): void {
    this._connection = connection;

    // If we were already subscribed (reconnection scenario), re-subscribe
    if (this._loaded) {
      this._unsubscribe?.();
      this._startSubscription();
    }

    // If there were pending callbacks waiting for a connection, start now
    if (this._pendingCallbacks.length > 0 && !this._subscribing) {
      this._startSubscription();
    }
  }

  /**
   * Clean up the subscription and all internal state.
   */
  unsubscribe(): void {
    this._clearTeardownTimer();
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
    this._loaded = false;
    this._subscribing = false;
    this._subscriberCount = 0;
  }

  private _onContextRequest = (ev: Event): void => {
    const contextEvent = ev as Event & {
      context: unknown;
      callback: (value: T, unsubscribe?: () => void) => void;
      contextTarget?: Element;
      subscribe?: boolean;
    };

    // Only handle requests for our context
    if (contextEvent.context !== this._context) {
      return;
    }

    const consumerHost =
      contextEvent.contextTarget ?? (ev.composedPath()[0] as Element);

    // Don't self-register
    if (consumerHost === this._host) {
      return;
    }

    if (!this._loaded) {
      // Data not loaded yet — intercept so the inner provider doesn't
      // call back with undefined.
      ev.stopImmediatePropagation();

      // Wrap the callback for subscribing consumers to track count.
      const callback = contextEvent.subscribe
        ? this._wrapCallback(contextEvent.callback)
        : contextEvent.callback;

      this._pendingCallbacks.push({
        callback,
        consumerHost,
        subscribe: contextEvent.subscribe,
      });

      // Trigger the subscription if not already in progress
      if (!this._subscribing && this._connection) {
        this._startSubscription();
      }
      return;
    }

    // Data is loaded — wrap subscribing callbacks to track count,
    // then let the inner ContextProvider handle the request.
    if (contextEvent.subscribe) {
      // A new subscriber arrived — cancel any pending teardown.
      this._clearTeardownTimer();

      // Replace the callback on the event with our wrapped version
      // so the inner provider registers the wrapped one.
      contextEvent.callback = this._wrapCallback(contextEvent.callback);
    }

    // Let the event continue to the inner ContextProvider.
  };

  /**
   * Wrap a subscribing consumer's callback to track subscribe/unsubscribe.
   * When the inner provider calls `callback(value, disposer)`, we replace
   * the disposer with one that decrements our count and schedules teardown.
   */
  private _wrapCallback(
    originalCallback: (value: T, unsubscribe?: () => void) => void
  ): (value: T, unsubscribe?: () => void) => void {
    let tracked = false;
    return (value: T, disposer?: () => void) => {
      if (!tracked && disposer) {
        // First call with a disposer — this consumer is now subscribed.
        tracked = true;
        this._subscriberCount++;
        this._clearTeardownTimer();
      }

      const wrappedDisposer = disposer
        ? () => {
            if (tracked) {
              tracked = false;
              this._subscriberCount--;
              if (this._subscriberCount === 0 && this._loaded) {
                this._scheduleTeardown();
              }
            }
            disposer();
          }
        : undefined;

      originalCallback(value, wrappedDisposer);
    };
  }

  /**
   * Schedule tearing down the WebSocket subscription after the grace period.
   */
  private _scheduleTeardown(): void {
    this._clearTeardownTimer();
    this._teardownTimer = setTimeout(() => {
      this._teardownTimer = undefined;
      if (this._subscriberCount === 0) {
        this._teardownSubscription();
      }
    }, IDLE_TEARDOWN_MS);
  }

  private _clearTeardownTimer(): void {
    if (this._teardownTimer !== undefined) {
      clearTimeout(this._teardownTimer);
      this._teardownTimer = undefined;
    }
  }

  /**
   * Tear down the WebSocket subscription and reset to the unloaded state.
   * The next consumer request will trigger a fresh subscription.
   */
  private _teardownSubscription(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
    this._loaded = false;
    this._subscribing = false;
    // Clear the inner provider's value so stale data isn't served.
    // The inner provider also holds subscriptions in its map; clearing
    // them is not needed since all consumers have already unsubscribed.
  }

  private _startSubscription(): void {
    if (!this._connection || this._subscribing) {
      return;
    }
    this._subscribing = true;

    const result = this._subscribeFn(this._connection, (value: T) => {
      this._loaded = true;
      this._subscribing = false;

      // Set the value on the real provider — this updates all existing subscribers
      this._provider.setValue(value as ContextType<C>);

      // Flush any pending callbacks that were buffered before data loaded
      this._flushPendingCallbacks();
    });

    // Handle async unsubscribe (Promise<UnsubscribeFunc>)
    if (result instanceof Promise) {
      result.then((unsub) => {
        this._unsubscribe = unsub;
      });
    } else {
      this._unsubscribe = result;
    }
  }

  private _flushPendingCallbacks(): void {
    if (this._pendingCallbacks.length === 0) {
      return;
    }

    const pending = [...this._pendingCallbacks];
    this._pendingCallbacks = [];

    // Re-add each pending callback to the provider now that it has data
    for (const { callback, consumerHost, subscribe } of pending) {
      (
        this._provider as unknown as {
          addCallback: (
            callback: (value: T, unsubscribe?: () => void) => void,
            consumerHost: Element,
            subscribe?: boolean
          ) => void;
        }
      ).addCallback(callback, consumerHost, subscribe);
    }
  }
}
