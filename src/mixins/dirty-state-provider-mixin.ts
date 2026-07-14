import { provide } from "@lit/context";
import deepClone from "deep-clone-simple";
import type { LitElement, PropertyValues } from "lit";
import { state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
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
 * `isEffectiveDirty` runs the same comparison, but first passes each slice's
 * initial and current value through the optional `effectiveNormalize` function
 * given to `_initDirtyTracking`. Provide a normalizer that collapses values you
 * consider equivalent (e.g. a config with a toggle left at its default vs the
 * key being absent) so they do not read as dirty. Without a normalizer it is
 * identical to `isDirty`. Use `isEffectiveDirtyState` to decide whether closing
 * needs a "discard changes?" prompt, and `isDirtyState` to decide whether save
 * is enabled.
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
        { initial: State; current: State; normalizedInitial: State }
      >();

      private _dirtyCompareFn: (a: State, b: State) => boolean = deepEqual;

      private _dirtyCloneFn: (value: State) => State = (value) => value;

      private _effectiveNormalize?: (value: State) => State;

      @provide({ context: dirtyStateContext })
      @state()
      private _dirtyStateContext: DirtyStateContext<State, Key> =
        this._buildContextValue();

      private _normalizeEffective(value: State): State {
        return this._effectiveNormalize
          ? this._effectiveNormalize(value)
          : value;
      }

      private _buildContextValue(): DirtyStateContext<State, Key> {
        const slices = Array.from(this._dirtySlices.values());
        return {
          isDirty: slices.some(
            ({ initial, current }) => !this._dirtyCompareFn(initial, current)
          ),
          isEffectiveDirty: slices.some(
            ({ normalizedInitial, current }) =>
              !this._dirtyCompareFn(
                normalizedInitial,
                this._normalizeEffective(current)
              )
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

      protected updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);
        const isDirty = this.isDirtyState;
        if (isDirty !== window.isDirtyState) {
          window.isDirtyState = isDirty;
          fireEvent(window, "dirty-state-changed", { isDirty });
        }
      }

      public disconnectedCallback(): void {
        if (window.isDirtyState) {
          window.isDirtyState = false;
          fireEvent(window, "dirty-state-changed", { isDirty: false });
        }
        super.disconnectedCallback();
      }

      private _writeSlice(key: Key | DefaultDirtyStateKey, value: State): void {
        const slice = this._dirtySlices.get(key);
        if (!slice) {
          // First push for this key becomes the baseline.
          const initial = this._dirtyCloneFn(value);
          this._dirtySlices.set(key, {
            initial,
            current: value,
            normalizedInitial: this._normalizeEffective(initial),
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
       * `effectiveNormalize` transforms a slice value before the
       * `isEffectiveDirty` comparison, letting the caller treat values it
       * considers equivalent as clean (e.g. a config with a toggle at its
       * default vs the key being absent). It does not affect `isDirty`.
       *
       * Call again to reset (e.g. when the underlying entity changes).
       */
      protected _initDirtyTracking(
        strategy: CompareStrategy<State>,
        initialState?: State,
        effectiveNormalize?: (value: State) => State
      ): void {
        this._effectiveNormalize = effectiveNormalize;
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
          const initial = this._dirtyCloneFn(initialState);
          this._dirtySlices.set(DEFAULT_DIRTY_STATE_KEY, {
            initial,
            current: initialState,
            normalizedInitial: this._normalizeEffective(initial),
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
          slice.normalizedInitial = this._normalizeEffective(slice.initial);
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
       */
      public get isDirtyState(): boolean {
        return this._dirtyStateContext.isDirty;
      }

      /**
       * Like `isDirtyState`, but compares values after the `effectiveNormalize`
       * function passed to `_initDirtyTracking`, so values the caller treats as
       * equivalent (e.g. a toggle left at its default) do not read as dirty. Use
       * it to decide whether closing needs a "discard changes?" prompt, while
       * `isDirtyState` decides whether save is enabled.
       */
      public get isEffectiveDirtyState(): boolean {
        return this._dirtyStateContext.isEffectiveDirty;
      }
    }
    return DirtyStateProviderMixinClass;
  };
