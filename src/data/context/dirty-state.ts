import { createContext } from "@lit/context";

export interface DirtyStateContext<State = unknown> {
  /** Whether current state differs from the initial snapshot */
  isDirty: boolean;
  /** Current tracked state */
  state: State;
  /** Update the tracked state — triggers dirty comparison */
  setState: (state: State) => void;
  /** Reset initial snapshot to current state (marks clean) */
  markClean: () => void;
}

/**
 * Singleton context key for dirty-state tracking.
 *
 * Because Lit context keys are singletons, the value type is
 * `DirtyStateContext<unknown>`. The provider mixin and consumer controller
 * supply type-safe APIs on top of this boundary.
 */
export const dirtyStateContext = createContext<DirtyStateContext>("dirtyState");
