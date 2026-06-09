import { provide } from "@lit/context";
import deepClone from "deep-clone-simple";
import type { LitElement } from "lit";
import { state } from "lit/decorators";
import { deepEqual } from "../common/util/deep-equal";
import { shallowEqual } from "../common/util/shallow-equal";
import {
  DEFAULT_DIRTY_STATE_KEY,
  dirtyStateContext,
  type DefaultDirtyStateKey,
  type DirtyStateContext,
} from "../data/context/dirty-state";
import type { Constructor } from "../types";

export type CompareStrategy<State> =
  | { type: "deep" }
  | { type: "shallow" }
  | { type: "custom"; compare: (a: State, b: State) => boolean };

/**
 * Mixin that provides dirty-state tracking via Lit context.
 *
 * The provider holds a map of named slices. Each slice has its own initial
 * snapshot and current value, and is compared with the configured compare
 * strategy. `isDirty` is true when any slice differs from its initial value,
 * so independent contributors (e.g. a helper form alongside the entity
 * registry editor) can coexist without overwriting each other.
 *
 * @example Eager init for the provider's own slice:
 * ```ts
 * class MyDialog extends DirtyStateProviderMixin<MyDialogState>()(LitElement) {
 *   open() {
 *     this._initDirtyTracking({ type: "shallow" }, { name: "", icon: "" });
 *     // Update later with `this._updateDirtyState({ name, icon })`.
 *   }
 * }
 * ```
 *
 * @example Deferred init with child consumers:
 * ```ts
 * class MyPage extends DirtyStateProviderMixin<MyState, "their-key">()(LitElement) {
 *   connectedCallback() {
 *     super.connectedCallback();
 *     this._initDirtyTracking({ type: "deep" });
 *     // Child consumers push slices via `setState(value, "their-key")`.
 *   }
 * }
 * ```
 *
 * Child consumers:
 * ```ts
 * @consume({ context: dirtyStateContext, subscribe: true })
 * @state()
 * private _dirtyState?: DirtyStateContext<MyState, "my-section">;
 *
 * // Read: this._dirtyState?.isDirty
 * // Write: this._dirtyState?.setState(value, "my-section")
 * ```
 */
export const DirtyStateProviderMixin =
  <State = unknown, Key extends string = DefaultDirtyStateKey>() =>
  <Base extends Constructor<LitElement>>(superClass: Base) => {
    class DirtyStateProviderMixinClass extends superClass {
      private _dirtySlices = new Map<
        Key | DefaultDirtyStateKey,
        { initial: State; current: State }
      >();

      private _dirtyCompareFn: (a: State, b: State) => boolean = deepEqual;

      private _dirtyCloneFn: (value: State) => State = (value) => value;

      @provide({ context: dirtyStateContext })
      @state()
      private _dirtyStateContext: DirtyStateContext<State, Key> =
        this._buildContextValue();

      private _buildContextValue(): DirtyStateContext<State, Key> {
        return {
          isDirty: Array.from(this._dirtySlices.values()).some(
            ({ initial, current }) => !this._dirtyCompareFn(initial, current)
          ),
          setState: (value: State, key: Key) => {
            this._writeSlice(key, value);
          },
          markClean: () => {
            this._markDirtyStateClean();
          },
        };
      }

      private _publishContext(): void {
        this._dirtyStateContext = this._buildContextValue();
      }

      private _writeSlice(key: Key | DefaultDirtyStateKey, value: State): void {
        const slice = this._dirtySlices.get(key);
        if (!slice) {
          // First push for this key becomes the baseline.
          this._dirtySlices.set(key, {
            initial: this._dirtyCloneFn(value),
            current: value,
          });
          this._publishContext();
          return;
        }
        if (this._dirtyCompareFn(slice.current, value)) {
          return;
        }
        slice.current = value;
        this._publishContext();
      }

      /**
       * Initialize dirty state tracking.
       *
       * When `initialState` is provided, it seeds the provider's own slice so
       * `_updateDirtyState` can be used immediately. When omitted, the first
       * push for any key (via the provider helper or a consumer's `setState`)
       * becomes that key's baseline.
       *
       * Call again to reset (e.g. when the underlying entity changes).
       */
      protected _initDirtyTracking(
        strategy: CompareStrategy<State>,
        initialState?: State
      ): void {
        switch (strategy.type) {
          case "deep":
            this._dirtyCompareFn = (a, b) => deepEqual(a, b);
            this._dirtyCloneFn = (value) => deepClone(value);
            break;
          case "shallow":
            this._dirtyCompareFn = (a, b) => shallowEqual(a, b);
            this._dirtyCloneFn = (value) => value;
            break;
          default:
            this._dirtyCompareFn = strategy.compare;
            this._dirtyCloneFn = (value) => value;
        }
        this._dirtySlices.clear();
        if (initialState !== undefined) {
          this._dirtySlices.set(DEFAULT_DIRTY_STATE_KEY, {
            initial: this._dirtyCloneFn(initialState),
            current: initialState,
          });
        }
        this._publishContext();
      }

      /**
       * Update the provider's own state slice. Triggers dirty comparison
       * against the provider's baseline (or sets the baseline if this is the
       * first push after a deferred init).
       */
      protected _updateDirtyState(newState: State): void {
        this._writeSlice(DEFAULT_DIRTY_STATE_KEY, newState);
      }

      /**
       * Reset every slice's baseline to its current value. Call this after a
       * successful save.
       */
      protected _markDirtyStateClean(): void {
        for (const slice of this._dirtySlices.values()) {
          slice.initial = this._dirtyCloneFn(slice.current);
        }
        this._publishContext();
      }

      /**
       * Discard pending changes by restoring each slice's current value back
       * to its baseline.
       */
      protected _discardDirtyStateChanges(): void {
        for (const slice of this._dirtySlices.values()) {
          slice.current = this._dirtyCloneFn(slice.initial);
        }
        this._publishContext();
      }

      /**
       * Whether any slice's current value differs from its baseline.
       * This passes the protected getter to the consuming class.
       */
      public get isDirtyState(): boolean {
        return this._dirtyStateContext.isDirty;
      }
    }
    return DirtyStateProviderMixinClass;
  };
