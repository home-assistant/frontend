import { consume } from "@lit/context";
import type { PropertyValues, ReactiveElement } from "lit";
import { state } from "lit/decorators";
import type { ConditionEvaluation } from "../common/controllers/condition-evaluator-controller";
import { ConditionEvaluatorController } from "../common/controllers/condition-evaluator-controller";
import { maxColumnsContext } from "../panels/lovelace/common/context";
import type {
  Condition,
  ConditionContext,
  VisibilityCondition,
} from "../panels/lovelace/common/validate-condition";
import {
  addEntityToCondition,
  checkConditionsMet,
} from "../panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../types";

type Constructor<T> = abstract new (...args: any[]) => T;

/**
 * Base config type that can be used with conditional listeners
 */
export interface ConditionalConfig {
  visibility?: Condition[];
  [key: string]: any;
}

/**
 * Mixin to handle conditional visibility control.
 *
 * Visibility conditions are evaluated by a {@link ConditionEvaluatorController}:
 * stateful conditions (`state`, `numeric_state`, `template`, `sun`, `zone`,
 * `device`, integration conditions) are delegated to core via
 * `subscribe_condition`, while client-only conditions (`screen`, `user`,
 * `view_columns`, `location`, `time`) are evaluated locally. The host stays
 * declarative — it never evaluates conditions itself.
 *
 * Usage:
 * 1. Extend with `ConditionalListenerMixin<YourConfigType>(ReactiveElement)`.
 * 2. Provide conditions via `config.visibility` / `_config.visibility`, or by
 *    overriding `setupConditionalListeners()` and calling
 *    `super.setupConditionalListeners(customConditions)`.
 * 3. Implement `_updateVisibility()` (or `_updateElement()`) and have it derive
 *    visibility from {@link _conditionsVisible} rather than evaluating
 *    conditions directly.
 *
 * The mixin automatically:
 * - feeds the evaluator on connect and whenever `hass`, the config, or the
 *   column count change;
 * - notifies the host (`_updateVisibility` / `_updateElement`) when the verdict
 *   changes; and
 * - tears down subscriptions on disconnect (handled by the controller).
 */
export const ConditionalListenerMixin = <
  TConfig extends ConditionalConfig = ConditionalConfig,
>(
  superClass: Constructor<ReactiveElement>
) => {
  abstract class ConditionalListenerClass extends superClass {
    protected _config?: TConfig;

    public config?: TConfig;

    public hass?: HomeAssistant;

    @state()
    @consume({ context: maxColumnsContext, subscribe: true })
    protected _maxColumns?: number;

    protected _conditionContext: ConditionContext = {};

    // The conditions currently being evaluated (a card/badge/section/view
    // `visibility`, or the conditional card/row `conditions`). Retained so the
    // optimistic synchronous seed evaluates exactly what the evaluator
    // subscribed to.
    private __conditions?: VisibilityCondition[];

    // Latest server-aware verdict from the evaluator. `unknown` until a server
    // subtree first reports (or immediately for an all-client tree).
    private __conditionResult: ConditionEvaluation = "unknown";

    // Cache for the entity-folded array fed to the evaluator. Rebuilt only when
    // the source tree reference or the entity context changes, so the
    // evaluator's reference-based signature memo keeps hitting on hass-only
    // updates instead of re-stringifying every tick.
    private __observedSource?: VisibilityCondition[];

    private __observedEntityId?: string;

    private __observed?: VisibilityCondition[];

    // Value signature of the source tree, used to drop the cached verdict when
    // the tree changes by value so `_conditionsVisible` re-seeds for it.
    private __conditionsSignature?: string;

    private __conditionEvaluator = new ConditionEvaluatorController(this, {
      // The synchronous seed in `_conditionsVisible` covers the initial frame,
      // so there is no need to delay (re)subscribing.
      resubscribeDelay: 0,
      onResult: (result) => {
        this.__conditionResult = result;
        // The forced `unknown` on disconnect only matters to hosts that render
        // the evaluator's result; we drive visibility imperatively, so ignore
        // notifications once detached.
        if (!this.isConnected) {
          return;
        }
        const config = this._config || this.config;
        if (this._updateVisibility) {
          this._updateVisibility();
        } else if (this._updateElement && config) {
          this._updateElement(config);
        }
      },
    });

    protected _updateElement?(config: TConfig): void;

    protected _updateVisibility?(conditionsMet?: boolean): void;

    public connectedCallback() {
      super.connectedCallback();
      this.setupConditionalListeners();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this.clearConditionalListeners();
    }

    protected willUpdate(changedProperties: PropertyValues) {
      super.willUpdate(changedProperties);
      if (changedProperties.has("_maxColumns")) {
        this._conditionContext = {
          ...this._conditionContext,
          max_columns: this._maxColumns,
        };
      }
    }

    protected updated(changedProperties: PropertyValues) {
      super.updated(changedProperties);
      // Re-feed the evaluator after the host has settled its inputs (e.g.
      // `_conditionContext.entity_id`, which consumers set in `willUpdate`).
      // The evaluator only re-subscribes when the *tree* changes; a
      // hass/context change merely recomputes.
      if (
        changedProperties.has("hass") ||
        changedProperties.has("config") ||
        changedProperties.has("_config") ||
        changedProperties.has("_maxColumns")
      ) {
        this.setupConditionalListeners();
      }
    }

    /**
     * Resolve the observed conditions to a visibility boolean.
     *
     * Prefers the evaluator's server-aware verdict; while a server subtree is
     * still pending (`unknown`) it falls back to an optimistic synchronous
     * client evaluation. That fallback is exact for the legacy lovelace
     * condition types (so existing dashboards never flash) and resolves to
     * hidden for core-only conditions (`template` / `sun` / …) until the server
     * reports — erring toward hiding rather than leaking content.
     *
     * Consumers call this from `_updateVisibility` instead of evaluating
     * `checkConditionsMet` themselves.
     */
    protected _conditionsVisible(): boolean {
      const conditions = this.__conditions;
      if (!conditions || conditions.length === 0) {
        return true;
      }
      if (this.__conditionResult !== "unknown") {
        return this.__conditionResult === "visible";
      }
      if (!this.hass) {
        return true;
      }
      return checkConditionsMet(
        conditions as Condition[],
        this.hass,
        this._conditionContext
      );
    }

    /**
     * Retained for API compatibility. The evaluator manages its own
     * subscriptions and tears them down on host disconnect, so there is nothing
     * for the host to clear.
     */
    protected clearConditionalListeners(): void {
      // no-op
    }

    /**
     * Retained for API compatibility; the evaluator owns its listeners.
     */
    protected addConditionalListener(_unsubscribe: () => void): void {
      // no-op
    }

    /**
     * Feed the current conditions to the evaluator.
     *
     * Override to supply a custom condition set (e.g. the conditional card's
     * `conditions`) and call `super.setupConditionalListeners(customConditions)`.
     *
     * @param conditions - Optional conditions. Defaults to
     * `config.visibility` / `_config.visibility`.
     */
    protected setupConditionalListeners(
      conditions?: VisibilityCondition[]
    ): void {
      // Prefer the resolved `_config` (e.g. a strategy-generated section config)
      // over the raw `config`, matching the pre-refactor evaluation source.
      const config = this._config || this.config;
      const finalConditions =
        conditions ?? (config?.visibility as VisibilityCondition[] | undefined);
      const entityId = this._conditionContext.entity_id;

      this.__conditions = finalConditions;

      // Re-derive the entity-folded array only when the source tree reference or
      // the entity context actually changes — not on every hass tick — so the
      // evaluator keeps seeing a stable array reference and its signature memo
      // keeps hitting. The evaluator translates to core format with no notion of
      // the host's `entity_id` context, so fold it in here (mirroring
      // `checkConditionsMet`, which reads `entity_id || entity || context`).
      if (
        finalConditions !== this.__observedSource ||
        entityId !== this.__observedEntityId
      ) {
        // When the tree changes by *value*, drop the cached verdict so
        // `_conditionsVisible` re-seeds for the new tree instead of reusing the
        // previous tree's result for a frame.
        const signature = finalConditions
          ? JSON.stringify(finalConditions)
          : undefined;
        if (signature !== this.__conditionsSignature) {
          this.__conditionsSignature = signature;
          this.__conditionResult = "unknown";
        }
        this.__observedSource = finalConditions;
        this.__observedEntityId = entityId;
        this.__observed =
          finalConditions && entityId
            ? ((finalConditions as Condition[]).map((c) =>
                addEntityToCondition(c, entityId)
              ) as VisibilityCondition[])
            : finalConditions;
      }

      this.__conditionEvaluator.observe(
        this.__observed,
        this.hass,
        () => this._conditionContext
      );
    }
  }
  return ConditionalListenerClass;
};
