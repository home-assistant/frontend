import { provide } from "@lit/context";
import type { LitElement } from "lit";
import { state } from "lit/decorators";
import { deepEqual } from "../common/util/deep-equal";
import { shallowEqual } from "../common/util/shallow-equal";
import {
  dirtyStateContext,
  type DirtyStateContext,
} from "../data/context/dirty-state";
import type { Constructor } from "../types";

export type CompareStrategy<State> =
  | { type: "deep" }
  | { type: "shallow" }
  | { type: "custom"; compare: (a: State, b: State) => boolean };

function resolveCompare<State>(
  strategy: CompareStrategy<State>
): (a: State, b: State) => boolean {
  switch (strategy.type) {
    case "deep":
      return (a, b) => deepEqual(a, b);
    case "shallow":
      return (a, b) => shallowEqual(a, b);
    default:
      return strategy.compare;
  }
}

/**
 * Mixin that provides dirty-state tracking via Lit context.
 *
 * Uses the `@provide` decorator so any descendant component can consume
 * dirty-state with `@consume({ context: dirtyStateContext, subscribe: true })`.
 *
 * Curried generic pattern: `State` is explicitly provided while `Base` is
 * inferred from the superclass argument.
 *
 * @example Eager init (state known upfront, e.g. dialog open):
 * ```ts
 * interface MyDialogState { name: string; icon: string }
 *
 * class MyDialog extends DirtyStateProviderMixin<MyDialogState>()(LitElement) {
 *   open() {
 *     this._initDirtyTracking({ type: "shallow" }, { name: "", icon: "" });
 *   }
 * }
 * ```
 *
 * @example Deferred init (child consumer reports initial state):
 * ```ts
 * class MyPage extends DirtyStateProviderMixin<FormState>()(LitElement) {
 *   connectedCallback() {
 *     super.connectedCallback();
 *     this._initDirtyTracking({ type: "deep" });
 *     // First setState from a child consumer sets the baseline
 *   }
 * }
 * ```
 *
 * Child consumers:
 * ```ts
 * @consume({ context: dirtyStateContext, subscribe: true })
 * @state()
 * private _dirtyState?: DirtyStateContext;
 *
 * // Read: this._dirtyState?.isDirty
 * // Write: this._dirtyState?.setState(newState)
 * ```
 */
export const DirtyStateProviderMixin =
  <State = unknown>() =>
  <Base extends Constructor<LitElement>>(superClass: Base) => {
    class DirtyStateProviderMixinClass extends superClass {
      private _dirtyInitialState: State | undefined;

      private _dirtyCurrentState: State | undefined;

      private _dirtyCompareFn: (a: State, b: State) => boolean = deepEqual;

      @provide({ context: dirtyStateContext })
      @state()
      private _dirtyStateContext: DirtyStateContext = this._buildContextValue(
        undefined,
        false
      );

      /**
       * Build the context value object for the provider.
       *
       * The returned type is `DirtyStateContext` (i.e. `DirtyStateContext<unknown>`)
       * because the singleton context key is typed at `unknown`. The single
       * `unknown → State` narrowing cast in `setState` is the only unsafe boundary
       * and is confined here.
       */
      private _buildContextValue(
        currentState: State | undefined,
        isDirty: boolean
      ): DirtyStateContext {
        return {
          isDirty,
          state: currentState,
          setState: (incoming: unknown) => {
            this._updateDirtyState(incoming as State);
          },
          markClean: () => {
            this._markDirtyStateClean();
          },
        };
      }

      /**
       * Initialize dirty state tracking.
       *
       * When `initialState` is provided, tracking starts immediately.
       * When omitted (deferred mode), the first `_updateDirtyState` /
       * `setState` call from a consumer becomes the baseline snapshot.
       *
       * Call again to reset (e.g. when the underlying entity changes).
       */
      protected _initDirtyTracking(
        strategy: CompareStrategy<State>,
        initialState?: State
      ): void {
        this._dirtyCompareFn = resolveCompare(strategy);
        if (initialState !== undefined) {
          this._dirtyInitialState = initialState;
          this._dirtyCurrentState = initialState;
          this._dirtyStateContext = this._buildContextValue(
            initialState,
            false
          );
        } else {
          this._dirtyInitialState = undefined;
          this._dirtyCurrentState = undefined;
          this._dirtyStateContext = this._buildContextValue(undefined, false);
        }
      }

      /**
       * Update the tracked state. Triggers dirty comparison against initial snapshot.
       *
       * If called before `_initDirtyTracking` provided an initial state (deferred
       * mode), the first call sets the baseline and reports clean.
       *
       * Guarded: no-ops if the computed dirty status and state reference are
       * unchanged, preventing render loops when called from `updated()`.
       */
      protected _updateDirtyState(newState: State): void {
        // Deferred init: first state becomes the baseline
        if (this._dirtyInitialState === undefined) {
          this._dirtyInitialState = newState;
          this._dirtyCurrentState = newState;
          this._dirtyStateContext = this._buildContextValue(newState, false);
          return;
        }

        const isDirty = !this._dirtyCompareFn(
          this._dirtyInitialState,
          newState
        );
        if (
          this._dirtyCurrentState !== undefined &&
          this._dirtyCompareFn(this._dirtyCurrentState, newState) &&
          this._dirtyStateContext.isDirty === isDirty
        ) {
          return;
        }
        this._dirtyCurrentState = newState;
        this._dirtyStateContext = this._buildContextValue(newState, isDirty);
      }

      /**
       * Reset the initial snapshot to the current state, marking the state as clean.
       * Call this after a successful save.
       */
      protected _markDirtyStateClean(): void {
        this._dirtyInitialState = this._dirtyCurrentState;
        this._dirtyStateContext = this._buildContextValue(
          this._dirtyCurrentState,
          false
        );
      }

      /**
       * Discard current changes and restore the last clean snapshot.
       */
      protected _discardDirtyStateChanges(): void {
        this._dirtyCurrentState = this._dirtyInitialState;
        this._dirtyStateContext = this._buildContextValue(
          this._dirtyInitialState,
          false
        );
      }

      /**
       * Whether the current state differs from the initial snapshot.
       */
      public get isDirtyState(): boolean {
        return this._dirtyStateContext.isDirty;
      }
    }
    return DirtyStateProviderMixinClass;
  };
