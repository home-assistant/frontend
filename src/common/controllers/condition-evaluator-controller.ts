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
import { isPureClientCondition } from "../condition/translate";
import type {
  ClientConditionEvaluator,
  ServerConditionResults,
  SplitConditionTree,
} from "../condition/split";
import { splitConditionTree } from "../condition/split";

/** `unknown` until a server subtree reports. */
export type ConditionEvaluation = "visible" | "hidden" | "unknown";

export interface ConditionEvaluatorOptions {
  onResult: (result: ConditionEvaluation, error?: string) => void;
  /** Wait this long before (re)opening subscriptions after the tree changes. */
  resubscribeDelay?: number;
}

const DEFAULT_RESUBSCRIBE_DELAY = 50;

const firstDefined = (
  values: Record<string, string | undefined>
): string | undefined => Object.values(values).find((value) => !!value);

/**
 * Live evaluation of a visibility tree: `subscribe_condition` for server
 * subtrees, local checks for screen/user/time/etc. Call {@link observe} when
 * inputs change. Result stays `unknown` until server replies so nothing flashes.
 */
export class ConditionEvaluatorController implements ReactiveController {
  private _host: ReactiveControllerHost;

  private readonly _onResult: ConditionEvaluatorOptions["onResult"];

  private readonly _resubscribeDelay: number;

  private _conditions?: VisibilityCondition[];

  private _hass?: HomeAssistant;

  private _getContext?: () => ConditionContext;

  private _connected = false;

  // Value of the live tree vs the tree a pending resubscribe will switch to.
  // Compared by content so a new array each render does not churn subscriptions.
  // `undefined` is a real signature, so pending work uses `_hasPendingResubscribe`.
  private _subscribedSignature?: string;

  private _pendingSignature?: string;

  private _hasPendingResubscribe = false;

  // Resubscribe if hass.connection is replaced even when the tree is unchanged.
  private _subscribedConnection?: Connection;

  // Skip JSON.stringify when the same array is observed again.
  private _lastConditionsRef?: VisibilityCondition[];

  private _lastSignature?: string;

  private _split?: SplitConditionTree;

  private _serverResults: ServerConditionResults = {};

  private _subtreeErrors: Record<string, string | undefined> = {};

  // Template errors from core that still produced a result. Shown in editors,
  // but they do not force hidden.
  private _subtreeTemplateErrors: Record<string, string | undefined> = {};

  private _subscriptions: Promise<UnsubscribeFunc>[] = [];

  private _listeners: (() => void)[] = [];

  // Ignore callbacks from a torn-down generation.
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
   * Update inputs. Resubscribes only when the tree (or connection) changes.
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
    // Subscriptions are gone; don't keep showing a stale result.
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
    // JSON turns ±Infinity into null; append them so `.inf` bound flips resubscribe.
    const nonFinite: string[] = [];
    const json = JSON.stringify(conditions, (_key, value) => {
      if (typeof value === "number" && !isFinite(value)) {
        nonFinite.push(String(value));
      }
      return value;
    });
    this._lastSignature = nonFinite.length
      ? `${json}|${nonFinite.join(",")}`
      : json;
    return this._lastSignature;
  }

  private _sync(): void {
    if (!this._connected) {
      return;
    }
    const signature = this._signatureOf(this._conditions);
    // Resubscribe when the tree content or hass.connection changed.
    const targetSignature = this._hasPendingResubscribe
      ? this._pendingSignature
      : this._subscribedSignature;
    const connectionReplaced =
      this._subscribedConnection !== undefined &&
      this._hass !== undefined &&
      this._hass.connection !== this._subscribedConnection;
    if (signature !== targetSignature || connectionReplaced) {
      // Drop the old subscriptions immediately so their result can't leak through.
      this._teardown();
      this._hasPendingResubscribe = true;
      this._pendingSignature = signature;
      if (
        this._conditions === undefined ||
        this._conditions.every(isPureClientCondition)
      ) {
        // All client-side; no server subscription to debounce.
        this._subscribe();
        return;
      }
      this._scheduleResubscribe();
    }
    // Keep client leaves live. Pending resubscribe has no split → `unknown`.
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
    this._pendingSignature = undefined;
    this._hasPendingResubscribe = false;

    if (!conditions || !hass) {
      // Don't mark subscribed yet; hass often arrives after connect.
      this._setResult("unknown", undefined);
      return;
    }
    this._subscribedSignature = this._signatureOf(conditions);

    const split = splitConditionTree(conditions);
    this._split = split;

    const generation = this._generation;
    const connection: Connection = hass.connection;
    this._subscribedConnection = connection;

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
          this._subtreeTemplateErrors[subtree.id] = message.template_errors
            ?.length
            ? message.template_errors.join("\n")
            : undefined;
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
        return checkConditionsMet([condition as Condition], hass, context);
      } catch (_err) {
        return false;
      }
    };

    const error = firstDefined(this._subtreeErrors);
    // Don't treat a server error as `false` that a client `not` would invert.
    if (error !== undefined) {
      this._setResult("hidden", error);
      return;
    }

    const value = this._split.evaluate(clientEvaluator, this._serverResults);
    const result: ConditionEvaluation =
      value === undefined ? "unknown" : value ? "visible" : "hidden";

    this._setResult(result, firstDefined(this._subtreeTemplateErrors));
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
    this._subtreeTemplateErrors = {};
    this._subscribedSignature = undefined;
    this._pendingSignature = undefined;
    this._hasPendingResubscribe = false;
    this._subscribedConnection = undefined;
  }
}
