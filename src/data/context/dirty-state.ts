import { createContext } from "@lit/context";

export const DEFAULT_DIRTY_STATE_KEY = "__default__";

export type DefaultDirtyStateKey = typeof DEFAULT_DIRTY_STATE_KEY;

export interface DirtyStateContext<
  State = unknown,
  Key extends string = DefaultDirtyStateKey,
> {
  /** Whether any contributor's current slice differs from its initial snapshot */
  isDirty: boolean;
  /**
   * Push a state slice. The first push for a slice sets its baseline.
   * Subsequent pushes are compared against that baseline using the provider's
   * compare strategy.
   */
  setState: (state: State, key: Key) => void;
  /** Reset every slice baseline to its current value (marks clean). */
  markClean: () => void;
}

/**
 * Singleton context key for dirty-state tracking.
 *
 * Because Lit context keys are singletons, the value type is
 * `DirtyStateContext<unknown, DefaultDirtyStateKey>`. Providers and consumers
 * can use narrower `DirtyStateContext<State, Key>` annotations at the type
 * boundary.
 */
export const dirtyStateContext = createContext<DirtyStateContext>("dirtyState");
