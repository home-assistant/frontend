import { consume } from "@lit/context";
import type { PropertyValues, ReactiveElement } from "lit";
import { state } from "lit/decorators";
import type { ConditionEvaluation } from "../common/controllers/condition-evaluator-controller";
import { ConditionEvaluatorController } from "../common/controllers/condition-evaluator-controller";
import { maxColumnsContext } from "../panels/lovelace/common/context";
import { evaluateConditionsLocally } from "../common/condition/evaluate-locally";
import type {
  ConditionContext,
  VisibilityCondition,
} from "../panels/lovelace/common/validate-condition";
import { addEntityToCondition } from "../panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../types";

type Constructor<T> = abstract new (...args: any[]) => T;

/**
 * Base config type that can be used with conditional listeners
 */
export interface ConditionalConfig {
  visibility?: VisibilityCondition[];
  [key: string]: any;
}

/**
 * Mixin for dashboard visibility.
 *
 * Stateful conditions go to core via `subscribe_condition`; screen/user/time
 * stay local. Call `_conditionsVisible()` from `_updateVisibility` /
 * `_updateElement`.
 *
 * Override `setupConditionalListeners()` to pass a custom list (e.g. a
 * conditional card's `conditions`).
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

    // What the evaluator is currently watching; used for the local seed.
    private __conditions?: VisibilityCondition[];

    // `unknown` until a server subtree reports (or immediately if all client).
    private __conditionResult: ConditionEvaluation = "unknown";

    // Folded conditions, rebuilt only when the source or entity id changes.
    private __observedSource?: VisibilityCondition[];

    private __observedEntityId?: string;

    private __observed?: VisibilityCondition[];

    // Drop the cached verdict when the tree content changes.
    private __conditionsSignature?: string;

    private __conditionEvaluator = new ConditionEvaluatorController(this, {
      // Local seed covers the first frame; no need to debounce.
      resubscribeDelay: 0,
      onResult: (result) => {
        this.__conditionResult = result;
        // We set visibility ourselves; ignore the disconnect `unknown`.
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
      // After willUpdate so consumers can set `_conditionContext.entity_id`.
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
     * True if the observed conditions currently pass.
     * Uses the server result when known; otherwise a local seed that stays
     * unknown (treated as hidden) for anything only core can evaluate.
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
      return (
        evaluateConditionsLocally(
          conditions,
          this.hass,
          this._conditionContext
        ) === true
      );
    }

    /**
     * Pass conditions to the evaluator.
     * Override to supply a custom list, then call `super.setupConditionalListeners(...)`.
     */
    protected setupConditionalListeners(
      conditions?: VisibilityCondition[]
    ): void {
      // Prefer resolved `_config` (strategy sections) over the raw `config`.
      const config = this._config || this.config;
      const finalConditions = conditions ?? config?.visibility;
      const entityId = this._conditionContext.entity_id;

      this.__conditions = finalConditions;

      // Fold in the host entity and keep a stable array across hass updates.
      if (
        finalConditions !== this.__observedSource ||
        entityId !== this.__observedEntityId
      ) {
        // Tree content changed; don't keep the previous result for a frame.
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
            ? finalConditions.map((c) => addEntityToCondition(c, entityId))
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
