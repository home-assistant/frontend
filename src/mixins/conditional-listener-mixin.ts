import type { PropertyValues, ReactiveElement } from "lit";
import { listenMediaQuery } from "../common/dom/media_query";
import type { HomeAssistant } from "../types";
import type { Condition } from "../panels/lovelace/common/validate-condition";
import { checkConditionsMet } from "../panels/lovelace/common/validate-condition";

type Constructor<T> = abstract new (...args: any[]) => T;

/**
 * Extract media queries from conditions recursively
 */
export function extractMediaQueries(conditions: Condition[]): string[] {
  return conditions.reduce<string[]>((array, c) => {
    if ("conditions" in c && c.conditions) {
      array.push(...extractMediaQueries(c.conditions));
    }
    if (c.condition === "screen" && c.media_query) {
      array.push(c.media_query);
    }
    return array;
  }, []);
}

/**
 * Helper to setup media query listeners for conditional visibility
 */
export function setupMediaQueryListeners(
  conditions: Condition[],
  hass: HomeAssistant,
  addListener: (unsub: () => void) => void,
  onUpdate: (conditionsMet: boolean) => void
): void {
  const mediaQueries = extractMediaQueries(conditions);

  if (mediaQueries.length === 0) return;

  // Optimization for single media query
  const hasOnlyMediaQuery =
    conditions.length === 1 &&
    conditions[0].condition === "screen" &&
    !!conditions[0].media_query;

  mediaQueries.forEach((mediaQuery) => {
    const unsub = listenMediaQuery(mediaQuery, (matches) => {
      if (hasOnlyMediaQuery) {
        onUpdate(matches);
      } else {
        const conditionsMet = checkConditionsMet(conditions, hass);
        onUpdate(conditionsMet);
      }
    });
    addListener(unsub);
  });
}

export const ConditionalListenerMixin = <
  T extends Constructor<ReactiveElement>,
>(
  superClass: T
) => {
  abstract class ConditionalListenerClass extends superClass {
    private __listeners: (() => void)[] = [];

    public connectedCallback() {
      super.connectedCallback();
      this.setupConditionalListeners();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this.clearConditionalListeners();
    }

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);
      if (changedProps.has("config")) {
        this.clearConditionalListeners();
        this.setupConditionalListeners();
      }
    }

    protected clearConditionalListeners(): void {
      this.__listeners.forEach((unsub) => unsub());
      this.__listeners = [];
    }

    protected addConditionalListener(unsubscribe: () => void): void {
      this.__listeners.push(unsubscribe);
    }

    protected setupConditionalListeners(): void {
      // Override in subclass
    }
  }
  return ConditionalListenerClass;
};
