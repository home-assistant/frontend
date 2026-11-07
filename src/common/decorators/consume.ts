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

interface ControllerConsumption {
  key: PropertyKey;
  context: Context<unknown, unknown>;
  subscribe: boolean;
  transform?: (value: unknown) => unknown;
}

const controllerConsumptions = new WeakMap<object, ControllerConsumption[]>();

/**
 * Base class for reactive controllers whose fields use {@link consumeContext}.
 * Each decorated field is kept current while the host is connected, and
 * `contextUpdated()` runs whenever one of them changes.
 */
export abstract class ContextController implements ReactiveController {
  protected readonly host: ReactiveControllerHost & HTMLElement;

  hostConnected?(): void;

  hostDisconnected?(): void;

  hostUpdate?(): void;

  hostUpdated?(): void;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.host = host;
    // On a connected host, Lit calls hostConnected() from addController(),
    // which would run before the subclass has initialized its own fields.
    if (host.isConnected) {
      queueMicrotask(() => this._consumeContexts());
    } else {
      this._consumeContexts();
    }
  }

  private _consumeContexts(): void {
    const fields = this as unknown as Record<PropertyKey, unknown>;
    for (
      let proto = Object.getPrototypeOf(this);
      proto;
      proto = Object.getPrototypeOf(proto)
    ) {
      controllerConsumptions
        .get(proto)
        ?.forEach(({ key, context, subscribe, transform }) => {
          new ContextSubscriptionController(
            this.host,
            context,
            (value) => {
              const next = transform ? transform(value) : value;
              if (Object.is(fields[key], next)) {
                return;
              }
              fields[key] = next;
              this.contextUpdated();
            },
            subscribe
          );
        });
    }
    // Added after the context subscriptions, so values are fresh when it connects.
    this.host.addController(this);
  }

  protected contextUpdated(): void {
    // Overridden by controllers that react to context changes.
  }
}

// The same check `@consume` gets from `@lit/context`: a public field must
// accept the stored value. Private fields are not visible to it.
type FieldMustAccept<Proto, Key extends PropertyKey, Value> =
  Proto extends Partial<Record<Key, infer Field>>
    ? [Value] extends [Field | undefined]
      ? undefined
      : {
          message: "stored type not assignable to consuming field";
          stored: Value;
          consuming: Field;
        }
    : undefined;

/**
 * `@consume` for fields of a {@link ContextController}. `transform` picks
 * the part of the context value to store; `contextUpdated()` only runs when
 * that part changes.
 */
export const consumeContext =
  <ValueType, TransformedType = ValueType>({
    context,
    subscribe = false,
    transform,
  }: {
    context: Context<unknown, ValueType>;
    subscribe?: boolean;
    transform?: (value: ValueType) => TransformedType;
  }) =>
  <Proto extends ContextController, Key extends PropertyKey>(
    proto: Proto,
    key: Key
  ): FieldMustAccept<Proto, Key, TransformedType> => {
    let consumptions = controllerConsumptions.get(proto);
    if (!consumptions) {
      consumptions = [];
      controllerConsumptions.set(proto, consumptions);
    }
    consumptions.push({
      key,
      context: context as Context<unknown, unknown>,
      subscribe,
      transform: transform as ControllerConsumption["transform"],
    });
    return undefined as FieldMustAccept<Proto, Key, TransformedType>;
  };
