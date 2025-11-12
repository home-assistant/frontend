import type { ReactiveElement } from "lit";
import type { HomeAssistant } from "../types";
import { setupMediaQueryListeners } from "../common/condition/listeners";
import type { Condition } from "../panels/lovelace/common/validate-condition";
import type { LovelaceCardConfig } from "../data/lovelace/config/card";

type Constructor<T> = abstract new (...args: any[]) => T;

/**
 * Mixin to handle conditional listeners for visibility control
 *
 * Provides lifecycle management for listeners that control conditional
 * visibility of components.
 *
 * Usage:
 * 1. Extend your component with ConditionalListenerMixin(ReactiveElement)
 * 2. Ensure component has config.visibility or _config.visibility property with conditions
 * 3. Ensure component has _updateVisibility() or _updateElement() method
 * 4. Override setupConditionalListeners() if custom behavior needed (e.g., filter conditions)
 *
 * The mixin automatically:
 * - Sets up listeners when component connects to DOM
 * - Cleans up listeners when component disconnects from DOM
 * - Handles conditional visibility based on defined conditions
 */
export const ConditionalListenerMixin = <
  T extends Constructor<ReactiveElement>,
>(
  superClass: T
) => {
  abstract class ConditionalListenerClass extends superClass {
    private __listeners: (() => void)[] = [];

    abstract _config?: LovelaceCardConfig;

    abstract config?: LovelaceCardConfig;

    abstract hass?: HomeAssistant;

    abstract _updateElement?: (config: LovelaceCardConfig) => void;

    abstract _updateVisibility?: (conditionsMet: boolean) => void;

    public connectedCallback() {
      super.connectedCallback();
      this.setupConditionalListeners();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this.clearConditionalListeners();
    }

    /**
     * Clear conditional listeners
     *
     * This method is called when the component is disconnected from the DOM.
     * It clears all the listeners that were set up by the setupConditionalListeners() method.
     */
    protected clearConditionalListeners(): void {
      this.__listeners.forEach((unsub) => unsub());
      this.__listeners = [];
    }

    /**
     * Add a conditional listener to the list of listeners
     *
     * This method is called when a new listener is added.
     * It adds the listener to the list of listeners.
     *
     * @param unsubscribe - The unsubscribe function to call when the listener is no longer needed
     * @returns void
     */
    protected addConditionalListener(unsubscribe: () => void): void {
      this.__listeners.push(unsubscribe);
    }

    /**
     * Setup conditional listeners for visibility control
     *
     * Default implementation:
     * - Checks config.visibility or _config.visibility for conditions (if not provided)
     * - Sets up appropriate listeners based on condition types
     * - Calls _updateVisibility() or _updateElement() when conditions change
     *
     * Override this method to customize behavior (e.g., filter conditions first)
     * and call super.setupConditionalListeners(customConditions) to reuse the base implementation
     *
     * @param conditions - Optional conditions array. If not provided, will check config.visibility or _config.visibility
     */
    protected setupConditionalListeners(conditions?: Condition[]): void {
      const finalConditions =
        conditions || this.config?.visibility || this._config?.visibility;

      if (!finalConditions || !this.hass) {
        return;
      }

      const onUpdate = (conditionsMet: boolean) => {
        if (this._updateVisibility) {
          this._updateVisibility(conditionsMet);
        } else if (this._updateElement && this.config) {
          this._updateElement(this.config);
        }
      };

      setupMediaQueryListeners(
        finalConditions,
        this.hass,
        (unsub) => this.addConditionalListener(unsub),
        onUpdate
      );
    }
  }
  return ConditionalListenerClass;
};
