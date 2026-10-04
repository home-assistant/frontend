// `consume` is only imported for its type, to keep the same signature.
/* eslint-disable no-restricted-imports */
import {
  ContextEvent,
  type Context,
  type ContextCallback,
  type consume as litConsume,
} from "@lit/context";
/* eslint-enable no-restricted-imports */
import type {
  ReactiveController,
  ReactiveControllerHost,
  ReactiveElement,
} from "lit";

/**
 * Reactive controller that subscribes to a Lit context and hands each
 * delivered value to `assign` — WITHOUT forcing a host update.
 *
 * `@lit/context`'s built-in `ContextConsumer` calls `host.requestUpdate()`
 * (without a property key) on every provider notification. That makes every
 * consumed field behave as if it was reactive state, even without `@state()`,
 * and bypasses any `hasChanged` / `@transform` gating on the field. For a hot
 * context such as `statesContext` (replaced on every entity state change) that
 * means every consumer runs an update/render cycle on every state change.
 *
 * This controller leaves update scheduling to the property itself:
 * - with `@state()`, an update is requested when the value changes
 *   (Lit gates `requestUpdate(key, oldValue)` with `hasChanged`),
 * - with `@transform`, only when the transformed value changes,
 * - without either, the field is a plain non-reactive value that is kept up to
 *   date but never triggers a render. Use this for values only read in event
 *   handlers or callbacks (e.g. `apiContext`).
 *
 * Use it instead of `ContextConsumer` in controllers or for lazily created
 * subscriptions. `assign` must store the value in a reactive field or call
 * `host.requestUpdate()` itself when the host needs to rerender.
 */
export class ContextSubscriptionController<
  ValueType,
> implements ReactiveController {
  private _unsubscribe?: () => void;

  constructor(
    private readonly _host: ReactiveControllerHost & HTMLElement,
    private readonly _context: Context<unknown, ValueType>,
    private readonly _assign: (value: ValueType) => void,
    private readonly _subscribe = true
  ) {
    this._host.addController(this);
  }

  public hostConnected(): void {
    this._host.dispatchEvent(
      new ContextEvent(
        this._context,
        this._host,
        this._callback,
        this._subscribe
      )
    );
  }

  public hostDisconnected(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  // Class field arrow function so the identity is stable per instance, which the
  // provider's subscription bookkeeping and `ContextRoot` deduping rely on.
  private readonly _callback: ContextCallback<ValueType> = (
    value,
    unsubscribe
  ) => {
    // A different provider answered (e.g. re-parenting); drop the stale one.
    if (this._unsubscribe && this._unsubscribe !== unsubscribe) {
      this._unsubscribe();
    }
    if (!this._subscribe) {
      // One-shot consumption: take the value and stop listening.
      unsubscribe?.();
      this._unsubscribe = undefined;
    } else {
      this._unsubscribe = unsubscribe;
    }
    // Assign through the property setter, which decides — via `hasChanged` —
    // whether an update is actually needed. We intentionally never call
    // `host.requestUpdate()` here.
    this._assign(value);
  };
}

/**
 * Drop-in replacement for `@consume` from `@lit/context` that does not force
 * a host update on every provider notification — see
 * {@link ContextSubscriptionController}.
 *
 * Mark the field with `@state()` (or pair it with `@transform`) when the value
 * is used for rendering. Leave it undecorated when it is only read outside of
 * the render cycle, so context changes do not rerender the component.
 */
const consumeImpl =
  <ValueType>({
    context,
    subscribe = false,
  }: {
    context: Context<unknown, ValueType>;
    subscribe?: boolean;
  }) =>
  (proto: object, propertyKey: PropertyKey): void => {
    if (typeof propertyKey === "object") {
      throw new Error("This decorator does not support this compilation type.");
    }
    (proto.constructor as unknown as typeof ReactiveElement).addInitializer(
      (host) => {
        new ContextSubscriptionController<ValueType>(
          host as ReactiveElement,
          context,
          (value) => {
            (host as unknown as Record<PropertyKey, unknown>)[propertyKey] =
              value;
          },
          subscribe
        );
      }
    );
  };

// Reuse the `@lit/context` signature so the consuming field is still
// type-checked against the context value type.
export const consume = consumeImpl as unknown as typeof litConsume;
