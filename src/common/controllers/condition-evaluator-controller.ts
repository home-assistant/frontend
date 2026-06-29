import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { subscribeCondition } from "../../data/automation";
import type {
  Condition,
  ConditionContext,
  VisibilityCondition,
} from "../../panels/lovelace/common/validate-condition";
import { checkConditionsMet } from "../../panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../types";
import { observeConditionChanges } from "../condition/listeners";
import type {
  ClientConditionEvaluator,
  ServerConditionResults,
  SplitConditionTree,
} from "../condition/split";
import { splitConditionTree } from "../condition/split";

/** Tri-state visibility outcome. `unknown` = a server subtree has not reported yet. */
export type ConditionEvaluation = "visible" | "hidden" | "unknown";

export interface ConditionEvaluatorOptions {
  /** Called whenever the combined result or error changes. */
  onResult: (result: ConditionEvaluation, error?: string) => void;
  /** Debounce (ms) before (re)opening subscriptions when the tree changes. */
  resubscribeDelay?: number;
}

const DEFAULT_RESUBSCRIBE_DELAY = 50;

/**
 * Reactive controller that keeps a dashboard visibility condition tree
 * evaluated live by combining:
 *
 * - `subscribe_condition` subscriptions, one per maximal server subtree
 *   (`state`, `numeric_state`, `template`, `sun`, `zone`, `device`,
 *   integration conditions), and
 * - locally-evaluated client leaves (`screen`, `user`, `view_columns`,
 *   `location`, `time`), reacting to media-query / time-boundary / hass /
 *   context changes.
 *
 * The host calls {@link observe} whenever its inputs change; the controller
 * only (re)subscribes when the *condition tree* changes (debounced) and merely
 * recomputes for hass/context changes. Subscriptions are torn down on host
 * disconnect and re-opened on reconnect. The combined result uses three-valued
 * logic so the host can render an explicit `unknown` state without flashing
 * while server results are still pending.
 */
export class ConditionEvaluatorController implements ReactiveController {
  private _host: ReactiveControllerHost;

  private readonly _onResult: ConditionEvaluatorOptions["onResult"];

  private readonly _resubscribeDelay: number;

  private _conditions?: VisibilityCondition[];

  private _hass?: HomeAssistant;

  private _getContext?: () => ConditionContext;

  private _connected = false;

  // Structural signature of the tree the live subscriptions/listeners are for,
  // and of the tree a pending (debounced) re-subscribe will switch to. Compared
  // by value (not array reference) so a host re-deriving the array each render
  // does not starve the debounce or needlessly drop subscriptions.
  private _subscribedSignature?: string;

  private _pendingSignature?: string;

  // Memoize the signature for a stable array reference to avoid re-stringifying
  // on every host update.
  private _lastConditionsRef?: VisibilityCondition[];

  private _lastSignature?: string;

  private _split?: SplitConditionTree;

  private _serverResults: ServerConditionResults = {};

  private _subtreeErrors: Record<string, string | undefined> = {};

  private _subscriptions: Promise<UnsubscribeFunc>[] = [];

  private _listeners: (() => void)[] = [];

  // Bumped on every teardown so late-arriving async results are ignored.
  private _generation = 0;

  private _resubscribeTimeout?: ReturnType<typeof setTimeout>;

  private _result: ConditionEvaluation = "unknown";

  private _error?: string;

  private _notifiedResult?: ConditionEvaluation;

  private _notifiedError?: string;

  constructor(
    host: ReactiveControllerHost,
    options: ConditionEvaluatorOptions
  ) {
    this._host = host;
    this._onResult = options.onResult;
    this._resubscribeDelay =
      options.resubscribeDelay ?? DEFAULT_RESUBSCRIBE_DELAY;
    host.addController(this);
  }

  public get result(): ConditionEvaluation {
    return this._result;
  }

  public get error(): string | undefined {
    return this._error;
  }

  /**
   * Provide the latest inputs. Cheap to call on every host update: it only
   * (re)subscribes when the condition tree reference changes, otherwise it just
   * recomputes the client-dependent parts.
   */
  public observe(
    conditions: VisibilityCondition[] | undefined,
    hass: HomeAssistant | undefined,
    getContext?: () => ConditionContext
  ): void {
    this._conditions = conditions;
    this._hass = hass;
    this._getContext = getContext;
    this._sync();
  }

  public hostConnected(): void {
    this._connected = true;
    this._sync();
  }

  public hostDisconnected(): void {
    this._connected = false;
    this._teardown();
    // Nothing backs the last result once subscriptions are closed; report
    // `unknown` (and force the notification through) so a detached/reconnecting
    // host never renders a stale, no-longer-live visibility.
    this._notifiedResult = undefined;
    this._notifiedError = undefined;
    this._setResult("unknown", undefined);
  }

  private _signatureOf(
    conditions: VisibilityCondition[] | undefined
  ): string | undefined {
    if (conditions === undefined) {
      return undefined;
    }
    if (conditions === this._lastConditionsRef) {
      return this._lastSignature;
    }
    this._lastConditionsRef = conditions;
    this._lastSignature = JSON.stringify(conditions);
    return this._lastSignature;
  }

  private _sync(): void {
    if (!this._connected) {
      return;
    }
    const signature = this._signatureOf(this._conditions);
    // Re-subscribe only when the tree we are (or are about to be) subscribed to
    // actually differs by value — not merely by array reference.
    const targetSignature = this._pendingSignature ?? this._subscribedSignature;
    if (signature !== targetSignature) {
      this._pendingSignature = signature;
      this._scheduleResubscribe();
    }
    // Always recompute so client leaves (and the current split) stay live, even
    // while a re-subscribe is pending.
    this._recompute();
  }

  private _scheduleResubscribe(): void {
    if (this._resubscribeTimeout !== undefined) {
      clearTimeout(this._resubscribeTimeout);
    }
    this._resubscribeTimeout = setTimeout(() => {
      this._resubscribeTimeout = undefined;
      this._subscribe();
    }, this._resubscribeDelay);
  }

  private _subscribe(): void {
    this._teardown();

    const conditions = this._conditions;
    const hass = this._hass;
    this._subscribedSignature = this._signatureOf(conditions);
    this._pendingSignature = undefined;

    if (!conditions || !hass) {
      this._setResult("unknown", undefined);
      return;
    }

    const split = splitConditionTree(conditions);
    this._split = split;

    const generation = this._generation;
    const connection: Connection = hass.connection;

    for (const subtree of split.serverSubtrees) {
      this._serverResults[subtree.id] = undefined;
      const subscription = subscribeCondition(
        connection,
        (message) => {
          if (generation !== this._generation) {
            return;
          }
          if (message.error !== undefined) {
            this._serverResults[subtree.id] = false;
            this._subtreeErrors[subtree.id] =
              typeof message.error === "string"
                ? message.error
                : message.error.message;
          } else {
            this._serverResults[subtree.id] = message.result;
            this._subtreeErrors[subtree.id] = undefined;
          }
          this._recompute();
        },
        subtree.coreCondition
      );
      subscription.catch((err: unknown) => {
        if (generation !== this._generation) {
          return;
        }
        this._serverResults[subtree.id] = false;
        this._subtreeErrors[subtree.id] =
          err instanceof Error ? err.message : String(err);
        this._recompute();
      });
      this._subscriptions.push(subscription);
    }

    observeConditionChanges(
      conditions,
      () => this._hass ?? hass,
      (unsub) => this._listeners.push(unsub),
      () => this._recompute()
    );

    this._recompute();
  }

  private _recompute(): void {
    if (!this._split || !this._hass) {
      this._setResult("unknown", undefined);
      return;
    }

    const hass = this._hass;
    const context = this._getContext?.() ?? {};
    const clientEvaluator: ClientConditionEvaluator = (condition) => {
      try {
        // Only client-class leaves reach here, and those are all lovelace
        // Condition members.
        return checkConditionsMet([condition as Condition], hass, context);
      } catch (_err) {
        return false;
      }
    };

    const value = this._split.evaluate(clientEvaluator, this._serverResults);
    const result: ConditionEvaluation =
      value === undefined ? "unknown" : value ? "visible" : "hidden";

    this._setResult(result, this._combinedError());
  }

  private _combinedError(): string | undefined {
    for (const error of Object.values(this._subtreeErrors)) {
      if (error) {
        return error;
      }
    }
    return undefined;
  }

  private _setResult(
    result: ConditionEvaluation,
    error: string | undefined
  ): void {
    this._result = result;
    this._error = error;
    if (result === this._notifiedResult && error === this._notifiedError) {
      return;
    }
    this._notifiedResult = result;
    this._notifiedError = error;
    this._onResult(result, error);
    this._host.requestUpdate();
  }

  private _teardown(): void {
    // Invalidate any in-flight subscription callbacks.
    this._generation += 1;
    if (this._resubscribeTimeout !== undefined) {
      clearTimeout(this._resubscribeTimeout);
      this._resubscribeTimeout = undefined;
    }
    for (const subscription of this._subscriptions) {
      subscription.then((unsub) => unsub()).catch(() => undefined);
    }
    this._subscriptions = [];
    for (const unsub of this._listeners) {
      unsub();
    }
    this._listeners = [];
    this._split = undefined;
    this._serverResults = {};
    this._subtreeErrors = {};
    this._subscribedSignature = undefined;
    this._pendingSignature = undefined;
  }
}
